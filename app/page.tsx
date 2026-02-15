"use client";

import React from 'react';
import { FeedProvider, useFeed } from '@/app/store/FeedContext';
import FeedSelector from '@/app/components/FeedSelector';
import NewsCard from '@/app/components/NewsCard';
import styles from './page.module.css';

function HomeContent() {
  const { articles, loading, feeds } = useFeed();

  return (
    <main className={styles.main}>
      <FeedSelector />
      
      <section className={styles.content}>
        {loading && (
          <div className={styles.center}>
            <div className={styles.loader}>Loading...</div>
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className={styles.center}>
            {feeds.length === 0 ? (
              <p>Welcome! Add an RSS feed to get started.</p>
            ) : (
              <p>No articles found. Try refreshing or adding more feeds.</p>
            )}
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div className="snap-y">
            {articles.map((article, index) => (
              <div key={index} className={`snap-center ${styles.page}`}>
                <NewsCard article={article} />
              </div>
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
