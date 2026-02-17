
import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic'; // Prevent caching of the route itself

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  const parser = new Parser({
    customFields: {
      item: ['media:content', 'media:group', 'enclosure', 'content:encoded'],
    },
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });

  try {
    const feed = await parser.parseURL(url);
    
    // Normalize feed data for frontend
    const items = feed.items.map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        contentSnippet: item.contentSnippet || item.content,
        content: item['content:encoded'] || item.content,
        isoDate: item.isoDate,
        source: feed.title
    }));

    return NextResponse.json({ 
        status: 'ok', 
        feed: { title: feed.title }, 
        items 
    });

  } catch (error: any) {
    console.error(`Error parsing feed ${url}:`, error);
    return NextResponse.json({ 
        error: 'Failed to parse feed', 
        details: error.message 
    }, { status: 500 });
  }
}
