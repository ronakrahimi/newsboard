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
  selectedArticle: Article | null;
  addFeed: (url: string, category?: string) => Promise<void>;
  removeFeed: (id: number) => void;
  setActiveFeedId: (id: number | "all") => void;
  setSelectedArticle: (article: Article | null) => void;
  refreshFeeds: () => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

const STORAGE_KEY = "newsboard_feeds_v5";

const DEFAULT_FEEDS: Feed[] = [
    // News
    { id: 101, url: "https://feeds.bbci.co.uk/news/rss.xml", name: "BBC News", category: "News" },
    { id: 102, url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", name: "NY Times", category: "News" },
    { id: 103, url: "https://www.reutersagency.com/feed/", name: "Reuters", category: "News" },
    { id: 105, url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", name: "Wall Street Journal", category: "News" },
    { id: 106, url: "https://feeds.npr.org/1001/rss.xml", name: "NPR", category: "News" },
    { id: 107, url: "https://www.theguardian.com/world/rss", name: "The Guardian", category: "News" },
    { id: 108, url: "https://www.aljazeera.com/xml/rss/all.xml", name: "Al Jazeera", category: "News" },
    { id: 109, url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?id=100003114", name: "CNBC", category: "News" },
    
    // Tech
    { id: 201, url: "https://techcrunch.com/feed/", name: "TechCrunch", category: "Tech" },
    { id: 202, url: "https://www.theverge.com/rss/index.xml", name: "The Verge", category: "Tech" },
    { id: 203, url: "https://feeds.arstechnica.com/arstechnica/index", name: "Ars Technica", category: "Tech" },
    { id: 204, url: "https://www.wired.com/feed/rss", name: "Wired", category: "Tech" },
    { id: 205, url: "https://hnrss.org/frontpage", name: "Hacker News", category: "Tech" },
    { id: 206, url: "https://www.engadget.com/rss.xml", name: "Engadget", category: "Tech" },
    { id: 207, url: "https://www.zdnet.com/news/rss.xml", name: "ZDNET", category: "Tech" },
    { id: 208, url: "https://thenextweb.com/feed", name: "The Next Web", category: "Tech" },
    { id: 209, url: "https://www.technologyreview.com/feed/", name: "MIT Tech Review", category: "Tech" },
    { id: 210, url: "https://feeds.feedburner.com/TheHackersNews", name: "The Hacker News", category: "Tech" },

    // Entertainment
    { id: 301, url: "https://variety.com/feed/", name: "Variety", category: "Entertainment" },
    { id: 302, url: "https://deadline.com/feed/", name: "Deadline", category: "Entertainment" },
    { id: 303, url: "https://www.hollywoodreporter.com/feed/", name: "Hollywood Reporter", category: "Entertainment" },
    { id: 304, url: "https://collider.com/feed/", name: "Collider", category: "Entertainment" },
    { id: 305, url: "https://screenrant.com/feed/", name: "Screen Rant", category: "Entertainment" },
    { id: 306, url: "https://www.indiewire.com/feed/", name: "IndieWire", category: "Entertainment" },
    { id: 307, url: "https://www.comingsoon.net/feed", name: "ComingSoon.net", category: "Entertainment" },
    { id: 308, url: "https://www.rogerebert.com/feed", name: "RogerEbert.com", category: "Entertainment" },
    { id: 309, url: "https://ew.com/feed/", name: "Entertainment Weekly", category: "Entertainment" },
    { id: 310, url: "https://www.slashfilm.com/feed/", name: "SlashFilm", category: "Entertainment" },

    // Finance
    { id: 401, url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", name: "WSJ Markets", category: "Finance" },
    { id: 402, url: "https://www.ft.com/?format=rss", name: "Financial Times", category: "Finance" },
    { id: 403, url: "https://www.marketwatch.com/rss/topstories", name: "MarketWatch", category: "Finance" },
    { id: 404, url: "https://feeds.bloomberg.com/markets/news.rss", name: "Bloomberg", category: "Finance" },
    { id: 405, url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", name: "CNBC Finance", category: "Finance" },
    { id: 406, url: "https://www.economist.com/latest/rss.xml", name: "The Economist", category: "Finance" },
    { id: 407, url: "http://feeds.reuters.com/reuters/businessNews", name: "Reuters Business", category: "Finance" },
    { id: 408, url: "https://www.forbes.com/business/feed/", name: "Forbes Business", category: "Finance" },
    { id: 409, url: "https://services.investors.com/rssfeeds.aspx", name: "Investor's Business Daily", category: "Finance" },
    { id: 410, url: "https://seekingalpha.com/market_currents.xml", name: "Seeking Alpha", category: "Finance" },

    // AI
    { id: 501, url: "https://openai.com/news/rss.xml", name: "OpenAI Blog", category: "AI" },
    { id: 502, url: "https://the-decoder.com/feed/", name: "The Decoder", category: "AI" },
    { id: 503, url: "https://deepmind.google/blog/feed/", name: "Google DeepMind", category: "AI" },
    { id: 504, url: "https://tldr.tech/ai/rss", name: "TLDR AI", category: "AI" },
    { id: 505, url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/", name: "MIT Tech Review (AI)", category: "AI" },
    { id: 506, url: "https://huggingface.co/blog/feed.xml", name: "Hugging Face Blog", category: "AI" },
    { id: 507, url: "https://www.bensbites.com/feed", name: "Ben's Bites", category: "AI" },
    { id: 508, url: "https://feeds.arstechnica.com/arstechnica/technology-lab", name: "Ars Technica (AI)", category: "AI" },
    { id: 509, url: "https://synthedia.substack.com/feed", name: "Synthedia", category: "AI" },
    { id: 510, url: "https://www.therundown.ai/feed", name: "The Rundown AI", category: "AI" },

    // Nature
    { id: 601, url: "https://www.nationalgeographic.com/arc/outboundfeeds/rss/", name: "National Geographic", category: "Nature" },
    { id: 602, url: "https://news.mongabay.com/feed/", name: "Mongabay", category: "Nature" },
    { id: 603, url: "https://grist.org/feed/", name: "Grist", category: "Nature" },
    { id: 604, url: "https://e360.yale.edu/feed", name: "Yale E360", category: "Nature" },
    { id: 605, url: "https://www.treehugger.com/rss/", name: "Treehugger", category: "Nature" },
    { id: 606, url: "https://www.theguardian.com/environment/rss", name: "The Guardian (Env)", category: "Nature" },
    { id: 607, url: "https://www.nature.com/nature.rss", name: "Nature News", category: "Nature" },
    { id: 608, url: "https://www.conservation.org/blog/rss", name: "Conservation Intl", category: "Nature" },
    { id: 609, url: "https://earth.org/feed/", name: "Earth.Org", category: "Nature" },
    { id: 610, url: "https://www.sciencedaily.com/rss/earth_climate/environmental_science.xml", name: "ScienceDaily (Env)", category: "Nature" },
];

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeFeedId, setActiveFeedId] = useState<number | "all">("all");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
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
        selectedArticle,
        addFeed,
        removeFeed,
        setActiveFeedId,
        setSelectedArticle,
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
