import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import { Readability } from '@mozilla/readability';
import https from 'https';

// Force Node.js runtime because JSDOM relies on Node.js APIs
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

    // 2. Parse HTML with JSDOM
    const virtualConsole = new jsdom.VirtualConsole();
    virtualConsole.on("error", () => { /* skip regex errors */ });
    
    // @ts-ignore
    const doc = new JSDOM(html, { url, virtualConsole });
    
    // 3. Extract content with Readability
    const reader = new Readability(doc.window.document);
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
    console.error('Smart Reader Error:', error.message);
    if (error.response) {
      console.error('Axios Status:', error.response.status);
    }

    return NextResponse.json({ 
      error: 'Failed to fetch article', 
      details: error.message 
    }, { status: 500 });
  }
}
