import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseFeed } from '@/lib/rss';

export async function GET() {
  try {
    const feeds = await prisma.feed.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(feeds);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch feeds' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, category } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate and get title
    const feedData = await parseFeed(url);
    const name = feedData.title || 'Untitled Feed';

    const newFeed = await prisma.feed.create({
      data: {
        url,
        name,
        category: category || 'General',
      },
    });

    return NextResponse.json(newFeed);
  } catch (error) {
    console.error('Error creating feed:', error);
    return NextResponse.json({ error: 'Failed to create feed. Invalid URL or DB error.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.feed.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete feed' }, { status: 500 });
  }
}
