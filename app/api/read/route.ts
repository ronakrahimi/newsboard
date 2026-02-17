import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import https from 'https';

// Force Node.js runtime because axios and Readability work best there
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  try {
    // 1. Fetch the HTML content
    const agent = new https.Agent({  
      rejectUnauthorized: false
    });

    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      timeout: 10000 
    });

    const html = response.data;

    // 2. Parse HTML with Linkedom (lighter and more stable than JSDOM)
    const { window } = parseHTML(html);
    
    // 3. Extract content with Readability
    const reader = new Readability(window.document);
    const article = reader.parse();

    if (!article) {
       return NextResponse.json({ error: 'Failed to parse article' }, { status: 422 });
    }

    return NextResponse.json({
      title: article.title,
      content: article.content,
      textContent: article.textContent,
      length: article.length,
      excerpt: article.excerpt,
      byline: article.byline,
      siteName: article.siteName,
      publishedTime: article.publishedTime,
    });

  } catch (error: any) {
    console.error('Smart Reader Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch article', 
      details: error.message,
      stack: error.stack,
      upstreamStatus: error.response?.status,
      upstreamStatusText: error.response?.statusText
    }, { status: 500 });
  }
}
