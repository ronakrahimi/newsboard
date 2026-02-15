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
  removeFeed: (id: number) => Promise<void>;
  setActiveFeedId: (id: number | "all") => void;
  refreshFeeds: () => Promise<void>;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeFeedId, setActiveFeedId] = useState<number | "all">("all");
  const [loading, setLoading] = useState(false);

  // Fetch Feeds from DB
  const refreshFeeds = useCallback(async () => {
    try {
      const res = await fetch("/api/feeds");
      const data = await res.json();
      setFeeds(data);
    } catch (e) {
      console.error("Failed to fetch feeds", e);
    }
  }, []);

  // Fetch Articles based on activeFeedId
  const refreshArticles = useCallback(async () => {
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
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(feed.url)}`);
          const data = await res.json();
          // Add source to each article
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (data.items || []).map((item: any) => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            contentSnippet: item.contentSnippet,
            content: item.content,
            isoDate: item.isoDate,
            source: feed.name,
          }));
        } catch (e) {
            console.error(`Failed to fetch RSS for ${feed.name}`, e);
            return [];
        }
      });

      const results = await Promise.all(articlePromises);
      const allArticles = results.flat().sort((a, b) => {
        return new Date(b.isoDate || b.pubDate).getTime() - new Date(a.isoDate || a.pubDate).getTime();
      });

      setArticles(allArticles);
    } catch (e) {
      console.error("Failed to fetch articles", e);
    } finally {
      setLoading(false);
    }
  }, [feeds, activeFeedId]);

  // Initial Load
  useEffect(() => {
    refreshFeeds();
  }, [refreshFeeds]);

  // Update articles when feeds or active feed changes
  useEffect(() => {
    refreshArticles();
  }, [refreshArticles, feeds]);

  const addFeed = async (url: string) => {
    try {
        const res = await fetch("/api/feeds", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
        if (res.ok) {
            await refreshFeeds();
        } else {
            alert("Failed to add feed. Check URL.");
        }
    } catch (e) {
        console.error("Error adding feed", e);
    }
  };

  const removeFeed = async (id: number) => {
      try {
          await fetch(`/api/feeds?id=${id}`, { method: "DELETE" });
          await refreshFeeds();
          if (activeFeedId === id) setActiveFeedId("all");
      } catch (e) {
          console.error("Error deleting feed", e);
      }
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
