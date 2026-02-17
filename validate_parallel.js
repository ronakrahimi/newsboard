const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');

const INPUT_CSV = '/Users/ronak/Documents/RSS feeds.csv';
const OUTPUT_CSV = path.join(__dirname, 'rss_validation_report.csv');
const CONCURRENCY = 10;

async function checkFeed(feed) {
  const { category, name, url } = feed;
  if (!url) return null;

  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get(url, {
      timeout: 8000,
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
           return `"${category}","${name}","${url}","Working","OK"`;
      } else {
           return `"${category}","${name}","${url}","Warning","Status 200 but content might not be XML"`;
      }
    } else {
      return `"${category}","${name}","${url}","Broken","Status ${response.status}"`;
    }
  } catch (error) {
    const msg = error.response ? `Status ${error.response.status}` : error.message;
    return `"${category}","${name}","${url}","Broken","${msg}"`;
  }
}

async function validateFeeds() {
  console.log(`Reading feeds from ${INPUT_CSV}...`);
  const content = fs.readFileSync(INPUT_CSV, 'utf8');
  const lines = content.split('\n');
  
  const feeds = [];
  let currentCategory = 'General';

  // Parse CSV
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Regex to split CSV lines respecting quotes
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if (parts.length < 2) continue;

    // Check if this line is a category header
    if (parts[1].trim() === 'RSS Feed Link') {
        currentCategory = parts[0].trim();
        continue;
    }

    const name = parts[0].trim();
    const url = parts[1].trim();

    if (!url.startsWith('http')) continue;

    feeds.push({ category: currentCategory, name, url });
  }

  console.log(`Testing ${feeds.length} feeds with concurrency ${CONCURRENCY}...`);

  const results = [];
  results.push('Category,Name,URL,Status,Message');

  // Process in chunks
  for (let i = 0; i < feeds.length; i += CONCURRENCY) {
    const chunk = feeds.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map(feed => checkFeed(feed)));
    results.push(...chunkResults.filter(r => r !== null));
    console.log(`Processed ${Math.min(i + CONCURRENCY, feeds.length)}/${feeds.length}`);
  }

  fs.writeFileSync(OUTPUT_CSV, results.join('\n'));
  console.log(`Report generated at ${OUTPUT_CSV}`);
}

validateFeeds();
