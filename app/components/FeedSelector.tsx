import React, { useState } from 'react';
import { useFeed } from '@/app/store/FeedContext';
import styles from './FeedSelector.module.css';

const FeedSelector: React.FC = () => {
  const { feeds, activeFeedId, setActiveFeedId, addFeed, removeFeed } = useFeed();
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    setIsAdding(true);
    await addFeed(newUrl);
    setNewUrl('');
    setIsAdding(false);
  };

  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.heading}>Your Feeds</h3>
      
      <div className={styles.list}>
        <button
          className={`${styles.item} ${activeFeedId === 'all' ? styles.active : ''}`}
          onClick={() => setActiveFeedId('all')}
        >
          All Stories
        </button>
        {feeds.map((feed) => (
          <div key={feed.id} className={styles.feedRow}>
            <button
              className={`${styles.item} ${activeFeedId === feed.id ? styles.active : ''}`}
              onClick={() => setActiveFeedId(feed.id)}
            >
              {feed.name}
            </button>
            <button 
              className={styles.deleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                if(confirm('Remove this feed?')) removeFeed(feed.id);
              }}
              aria-label="Remove feed"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className={styles.form}>
        <input
          type="url"
          placeholder="Add RSS URL..."
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className={styles.input}
          required
        />
        <button type="submit" className={styles.addBtn} disabled={isAdding}>
          {isAdding ? '...' : '+'}
        </button>
      </form>
    </aside>
  );
};

export default FeedSelector;
