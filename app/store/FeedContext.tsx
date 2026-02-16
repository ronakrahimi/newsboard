"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import he from 'he';

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
  addFeed: (url: string, category?: string) => Promise<void>;
  removeFeed: (id: number) => void;
  setActiveFeedId: (id: number | "all") => void;
  refreshFeeds: () => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

const STORAGE_KEY = "newsboard_feeds_v3";

const DEFAULT_FEEDS: Feed[] = [
    // News
    { id: 1, url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", name: "NYT > Top Stories", category: "News" },
    { id: 2, url: "https://www.theguardian.com/world/rss", name: "The Guardian", category: "News" },
    { id: 3, url: "https://feeds.bbci.co.uk/news/rss.xml", name: "BBC News", category: "News" },
    { id: 4, url: "https://www.reutersagency.com/feed/", name: "Reuters", category: "News" },
    
    // Tech
    { id: 10, url: "https://feeds.arstechnica.com/arstechnica/index", name: "Ars Technica", category: "Tech" },
    { id: 11, url: "https://www.theverge.com/rss/index.xml", name: "The Verge", category: "Tech" },
    { id: 12, url: "https://techcrunch.com/feed/", name: "TechCrunch", category: "Tech" },
    { id: 13, url: "https://www.wired.com/feed/rss", name: "Wired", category: "Tech" },

    // Entertainment
    { id: 20, url: "https://variety.com/feed/", name: "Variety", category: "Entertainment" },
    { id: 21, url: "https://deadline.com/feed/", name: "Deadline", category: "Entertainment" },
    { id: 22, url: "https://www.hollywoodreporter.com/feed/", name: "Hollywood Reporter", category: "Entertainment" },

    // Finance
    { id: 30, url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", name: "WSJ Markets", category: "Finance" },
    { id: 31, url: "https://www.ft.com/?format=rss", name: "Financial Times", category: "Finance" },
    { id: 32, url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?id=10000664", name: "CNBC Finance", category: "Finance" },

    // AI
    { id: 40, url: "https://openai.com/days/rss.xml", name: "OpenAI", category: "AI" }, /* Note: OpenAI feed URL often changes, checking validity */
    { id: 41, url: "https://the-decoder.com/feed/", name: "The Decoder", category: "AI" },
    { id: 42, url: "https://deepmind.google/blog/feed/", name: "Google DeepMind", category: "AI" },
    
    // Science & Nature
    { id: 50, url: "https://www.nationalgeographic.com/arc/outboundfeeds/rss/", name: "National Geographic", category: "Science" },
    { id: 51, url: "https://www.nature.com/nature.rss", name: "Nature", category: "Science" },
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (data.items || []).map((item: any) => ({
                    title: item.title ? decodeEntities(item.title) : "",
                    link: item.link,
                    pubDate: item.pubDate,
                    contentSnippet: (item.description || item.content) ? stripHtml(decodeEntities(item.description || item.content)) : "",
                    content: item.content,
                    isoDate: item.pubDate,
                    source: data.feed.title ? decodeEntities(data.feed.title) : ""
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

  // Utility to decode HTML entities
  const decodeEntities = (text: string) => {
    try {
        const decoded = he.decode(text);
        // Sometimes entities are double-encoded, or he.decode misses some edge cases with uppercase
        // A second pass or custom replacement for specific issues like &GT; might be needed if he fails
        return decoded.replace(/&GT;/g, '>'); 
    } catch (e) {
        console.warn("Entity decoding failed", e);
        return text;
    }
  };

  // Utility to strip HTML tags
  const stripHtml = (html: string) => {
     const doc = new DOMParser().parseFromString(html, 'text/html');
     return doc.body.textContent || "";
  };

  const parseXML = (xmlString: string) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const items = Array.from(xmlDoc.querySelectorAll("item"));
      const titleNode = xmlDoc.querySelector("channel > title");
      const feedTitle = titleNode?.textContent ? decodeEntities(titleNode.textContent) : "Unknown Source";

      return items.map(item => ({
          title: item.querySelector("title")?.textContent ? decodeEntities(item.querySelector("title")!.textContent!) : "",
          link: item.querySelector("link")?.textContent || "",
          pubDate: item.querySelector("pubDate")?.textContent || "",
          contentSnippet: item.querySelector("description")?.textContent ? stripHtml(decodeEntities(item.querySelector("description")!.textContent!)) : "",
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

  const addFeed = async (url: string, category: string = "General") => {
    try {
        const items = await fetchRSS(url);
        if (items && items.length > 0) {
             const newFeed: Feed = {
                id: Date.now(),
                url: url,
                name: items[0].source || "New Feed",
                category: category
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
