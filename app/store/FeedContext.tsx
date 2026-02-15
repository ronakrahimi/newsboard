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

  // Robust Fetch Function
  // Robust Fetch Function with Multiple Proxies
  const fetchRSS = async (url: string) => {
    const proxies = [
        {
            name: 'rss2json',
            fetch: async (target: string) => {
                const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(target)}`);
                if (!res.ok) throw new Error(`rss2json status: ${res.status}`);
                const data = await res.json();
                if (data.status !== 'ok') throw new Error('rss2json returned error status');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (data.items || []).map((item: any) => ({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    contentSnippet: item.description || item.content,
                    content: item.content,
                    isoDate: item.pubDate,
                    source: data.feed.title
                }));
            }
        },
        {
            name: 'allorigins',
            fetch: async (target: string) => {
                const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(target)}`);
                if (!res.ok) throw new Error(`allorigins status: ${res.status}`);
                const data = await res.json();
                if (!data.contents) throw new Error('allorigins no content');
                return parseXML(data.contents);
            }
        },
        {
            name: 'codetabs',
            fetch: async (target: string) => {
                const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`);
                if (!res.ok) throw new Error(`codetabs status: ${res.status}`);
                const text = await res.text();
                return parseXML(text);
            }
        }
    ];

    for (const proxy of proxies) {
        try {
            console.log(`Attempting fetch via ${proxy.name} for ${url}`);
            const items = await proxy.fetch(url);
            console.log(`Success via ${proxy.name}`);
            return items;
        } catch (e) {
            console.warn(`Failed via ${proxy.name}:`, e);
            // Continue to next proxy
        }
    }

    throw new Error("All proxies failed to fetch feed.");
  };

  const parseXML = (xmlString: string) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const items = Array.from(xmlDoc.querySelectorAll("item"));
      const feedTitle = xmlDoc.querySelector("channel > title")?.textContent || "Unknown Source";

      return items.map(item => ({
          title: item.querySelector("title")?.textContent || "",
          link: item.querySelector("link")?.textContent || "",
          pubDate: item.querySelector("pubDate")?.textContent || "",
          contentSnippet: item.querySelector("description")?.textContent || "",
          content: item.querySelector("content\\:encoded")?.textContent || item.querySelector("description")?.textContent || "",
          isoDate: item.querySelector("pubDate")?.textContent || "",
          source: feedTitle
      }));
  };

  const fetchArticles = useCallback(async () => {
    if (feeds.length === 0) return;
    setLoading(true);
    setArticles([]);

    const feedsToFetch =
      activeFeedId === "all"
        ? feeds
        : feeds.filter((f) => f.id === activeFeedId);

    const articlePromises = feedsToFetch.map(async (feed) => {
        try {
            const items = await fetchRSS(feed.url);
            return items.map((item: Article) => ({...item, source: feed.name}));
        } catch (e) {
            console.error(`Failed to fetch ${feed.name}`, e);
            return [];
        }
    });

    const results = await Promise.all(articlePromises);
    const allArticles = results.flat().sort((a, b) => {
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });

    setArticles(allArticles);
    setLoading(false);
  }, [feeds, activeFeedId]);


  // Update articles when feeds or active feed changes
  useEffect(() => {
    if (isInitialized) {
        fetchArticles();
    }
  }, [fetchArticles, isInitialized]); 

  const addFeed = async (url: string) => {
    try {
        const items = await fetchRSS(url);
        if (items && items.length > 0) {
             const newFeed: Feed = {
                id: Date.now(),
                url: url,
                name: items[0].source || "New Feed",
                category: "General"
            };
            setFeeds(prev => [...prev, newFeed]);
        } else {
             alert("Could not fetch feed. Check URL.");
        }
    } catch (e) {
        console.error("Error adding feed", e);
        alert("Invalid RSS Feed URL or Feed unreachable.");
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
