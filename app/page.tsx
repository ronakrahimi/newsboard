"use client";

import React from 'react';
import { FeedProvider, useFeed } from '@/app/store/FeedContext';
import FeedSelector from '@/app/components/FeedSelector';
import NewsCard from '@/app/components/NewsCard';
import ArticleReader from '@/app/components/ArticleReader';
import styles from './page.module.css';

function HomeContent() {
  const { articles, loading, feeds } = useFeed();

  return (
    <main className={styles.main}>
      <FeedSelector />
      <ArticleReader />
      
      <section className={styles.content}>
        {loading && (
          <div className={styles.center}>
            <div className={styles.loader}></div>
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className={styles.center}>
            {feeds.length === 0 ? (
              <p>Welcome! Add an RSS feed in the sidebar to get started.</p>
            ) : (
              <p>No articles found. Try refreshing or adding more feeds.</p>
            )}
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div className={styles.grid}>
            {articles.map((article, index) => (
              <NewsCard key={index} article={article} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <FeedProvider>
      <HomeContent />
    </FeedProvider>
  );
}
