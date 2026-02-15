import Parser from 'rss-parser';

export const parser = new Parser();

export async function parseFeed(url: string) {
  try {
    const feed = await parser.parseURL(url);
    return feed;
  } catch (error) {
    console.error(`Error parsing feed ${url}:`, error);
    throw new Error(`Failed to parse feed: ${url}`);
  }
}
