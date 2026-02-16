import React, { useState } from 'react';
import { useFeed } from '@/app/store/FeedContext';
import styles from './FeedSelector.module.css';

const FeedSelector: React.FC = () => {
  const { feeds, activeFeedId, setActiveFeedId, addFeed, removeFeed } = useFeed();
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('News');
  const [isAdding, setIsAdding] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ 'News': true, 'Tech': true, 'General': true });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    setIsAdding(true);
    await addFeed(newUrl, newCategory);
    setNewUrl('');
    setIsAdding(false);
  };

  // Group feeds
  const feedsByCategory = feeds.reduce((acc, feed) => {
    const cat = feed.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feed);
    return acc;
  }, {} as Record<string, typeof feeds>);

  const sortedCategories = Object.keys(feedsByCategory).sort();

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

        {sortedCategories.map(category => (
            <div key={category} className={styles.categoryGroup}>
                <button 
                    className={styles.categoryHeader} 
                    onClick={() => toggleCategory(category)}
                >
                    {category} 
                    <span className={styles.arrow}>{expandedCategories[category] ? '▼' : '▶'}</span>
                </button>
                
                {expandedCategories[category] && (
                    <div className={styles.categoryFeeds}>
                        {feedsByCategory[category].map(feed => (
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
                )}
            </div>
        ))}

      </div>

      <form onSubmit={handleAdd} className={styles.form}>
        <div className={styles.inputGroup}>
            <input
            type="url"
            placeholder="RSS URL..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className={styles.input}
            required
            />
            <select 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)}
                className={styles.select}
            >
                <option value="News">News</option>
                <option value="Tech">Tech</option>
                <option value="Design">Design</option>
                <option value="Finance">Finance</option>
                <option value="Sports">Sports</option>
                <option value="General">General</option>
            </select>
        </div>
        <button type="submit" className={styles.addBtn} disabled={isAdding}>
          {isAdding ? '...' : '+'}
        </button>
      </form>
    </aside>
  );
};

export default FeedSelector;
