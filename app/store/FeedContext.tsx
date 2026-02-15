"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Feed = {
  id: number;
  url: string;
  name: string;
  category: string;
};

type Article = {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  source: string;
};

interface FeedContextType {
  feeds: Feed[];
  articles: Article[];
  activeFeedId: number | null | "all"; // null = initial, "all" = aggregate
  loading: boolean;
  addFeed: (url: string) => Promise<void>;
  removeFeed: (id: number) => void;
  setActiveFeedId: (id: number | "all") => void;
  refreshFeeds: () => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

const STORAGE_KEY = "newsboard_feeds";

const DEFAULT_FEEDS: Feed[] = [
    { id: 1, url: "https://feeds.npr.org/1001/rss.xml", name: "NPR News", category: "News" },
];

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeFeedId, setActiveFeedId] = useState<number | "all">("all");
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load Feeds from LocalStorage on Mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        setFeeds(JSON.parse(saved));
    } else {
        setFeeds(DEFAULT_FEEDS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FEEDS));
    }
    setIsInitialized(true);
  }, []);

  // Save Feeds to LocalStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
    }
  }, [feeds, isInitialized]);

  const refreshFeeds = () => {
      // No-op for now as state manages itself, but kept for interface compatibility
  };

  // Fetch Articles using RSS2JSON (Public CORS Proxy)
  const fetchArticles = useCallback(async () => {
    if (feeds.length === 0) return;
    setLoading(true);
    setArticles([]);

    const feedsToFetch =
      activeFeedId === "all"
        ? feeds
        : feeds.filter((f) => f.id === activeFeedId);

    try {
      const articlePromises = feedsToFetch.map(async (feed) => {
        try {
          // Use RSS2JSON to bypass CORS
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
          const data = await res.json();
          
          if (data.status !== 'ok') {
              console.warn(`Failed to fetch ${feed.name}: ${data.message}`);
              return [];
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (data.items || []).map((item: any) => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            contentSnippet: item.description || item.content, // RSS2JSON maps description
            content: item.content,
            isoDate: item.pubDate, // RSS2JSON doesn't give isoDate always, assume pubDate is usable
            source: feed.name,
          }));
        } catch (e) {
            console.error(`Failed to fetch RSS for ${feed.name}`, e);
            return [];
        }
      });

      const results = await Promise.all(articlePromises);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allArticles = results.flat().sort((a: any, b: any) => {
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      });

      setArticles(allArticles);
    } catch (e) {
      console.error("Failed to fetch articles", e);
    } finally {
      setLoading(false);
    }
  }, [feeds, activeFeedId]);

  // Update articles when feeds or active feed changes
  useEffect(() => {
    if (isInitialized) {
        fetchArticles();
    }
  }, [fetchArticles, isInitialized]); // Removed 'feeds' dependency to avoid loop if feeds change but id doesn't needed? No, feeds needed.

  const addFeed = async (url: string) => {
    try {
        // Validation via fetching
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
        const data = await res.json();
        
        if (data.status === 'ok') {
            const newFeed: Feed = {
                id: Date.now(),
                url: url,
                name: data.feed.title || "New Feed",
                category: "General"
            };
            setFeeds(prev => [...prev, newFeed]);
        } else {
            alert("Invalid RSS Feed URL or Feed unreachable.");
        }
    } catch (e) {
        console.error("Error adding feed", e);
        alert("Error validating feed.");
    }
  };

  const removeFeed = (id: number) => {
      setFeeds(prev => prev.filter(f => f.id !== id));
      if (activeFeedId === id) setActiveFeedId("all");
  };

  return (
    <FeedContext.Provider
      value={{
        feeds,
        articles,
        activeFeedId,
        loading,
        addFeed,
        removeFeed,
        setActiveFeedId,
        refreshFeeds,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export function useFeed() {
  const context = useContext(FeedContext);
  if (context === undefined) {
    throw new Error("useFeed must be used within a FeedProvider");
  }
  return context;
}
