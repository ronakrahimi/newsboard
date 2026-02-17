const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');

const INPUT_CSV = '/Users/ronak/Documents/RSS feeds.csv';
const OUTPUT_CSV = path.join(__dirname, 'rss_validation_report.csv');

async function validateFeeds() {
  console.log(`Reading feeds from ${INPUT_CSV}...`);
  const content = fs.readFileSync(INPUT_CSV, 'utf8');
  const lines = content.split('\n');
  
  const results = [];
  results.push('Category,Name,URL,Status,Message');

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parse: assumes no commas in URLs, but names might have them.
    // The format seems to be: Name,URL,Description,,,,
    // Let's rely on the fact that URL is the 2nd field.
    // We can split by comma, but be careful of quoted fields.
    // A regex is safer: /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if (parts.length < 2) continue;

    const name = parts[0].trim();
    const url = parts[1].trim();
    let category = ''; 
    
    // Try to infer category from previous lines context or just leave empty if not critical
    // The Input file has category headers like "News,,,,," "Tech,,,,,"
    // But since we are iterating, we can keep track of the current category.
    if (parts[1].startsWith('RSS Feed Link')) {
        // This is a sub-header line
        continue;
    }
    
    if (!url.startsWith('http')) {
        // Likely a category header line like "News,RSS Feed Link..." or just "News"
        // In the provided file: 1: News,RSS Feed Link,...
        // So actually the first line of a block has the category in the first column?
        // Wait, line 1 is "News,RSS Feed Link..."
        // Line 14 is "Tech,RSS Feed Link..."
        // So if the 2nd col is "RSS Feed Link", the 1st col is the Category.
        // But the rows BELOW it don't have the category in the first column?
        // Line 2: "BBC News,https://..."
        // So the Category applies to subsequent lines.
        continue;
    }

    console.log(`Checking ${name}: ${url}`);

    try {
      const agent = new https.Agent({ rejectUnauthorized: false });
      const response = await axios.get(url, {
        timeout: 10000,
        httpsAgent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });

      const contentType = response.headers['content-type'];
      const isXML = (contentType && (contentType.includes('xml') || contentType.includes('rss'))) || 
                    (typeof response.data === 'string' && response.data.trim().startsWith('<'));

      if (response.status === 200) {
        if (isXML) {
             results.push(`"${name}","${url}","Working","OK"`);
        } else {
             results.push(`"${name}","${url}","Warning","Status 200 but content might not be XML"`);
        }
      } else {
        results.push(`"${name}","${url}","Broken","Status ${response.status}"`);
      }
    } catch (error) {
      const msg = error.response ? `Status ${error.response.status}` : error.message;
      results.push(`"${name}","${url}","Broken","${msg}"`);
    }
  }

  fs.writeFileSync(OUTPUT_CSV, results.join('\n'));
  console.log(`Report generated at ${OUTPUT_CSV}`);
}

validateFeeds();
