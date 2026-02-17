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

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
        {/* Mobile Header */}
        <div className={styles.mobileHeader} style={{ display: 'none' }}> {/* Hidden by default, shown via CSS media query */}
            <button 
                className={styles.hamburger}
                onClick={() => setIsMobileOpen(true)}
                aria-label="Open menu"
            >
                ☰
            </button>
            <span className={styles.brand}>NewsBoard</span>
            <div style={{ width: '24px' }}></div> {/* Spacer for balance */}
        </div>

        {/* Overlay */}
        <div 
            className={`${styles.overlay} ${isMobileOpen ? styles.visible : ''}`}
            onClick={() => setIsMobileOpen(false)}
        />

        <aside className={`${styles.sidebar} ${isMobileOpen ? styles.open : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className={styles.heading} style={{ marginBottom: 0 }}>Your Feeds</h3>
            {/* Mobile Close Button */}
            <button 
                className={styles.hamburger} 
                style={{ display: 'none', fontSize: '1.2rem' }} // Shown via CSS if needed, or we rely on clicking outside
                onClick={() => setIsMobileOpen(false)}
            >
                ✕
            </button>
        </div>
        
        <div className={styles.list}>
            <button
            className={`${styles.item} ${activeFeedId === 'all' ? styles.active : ''}`}
            onClick={() => {
                setActiveFeedId('all');
                setIsMobileOpen(false);
            }}
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
                                    onClick={() => {
                                        setActiveFeedId(feed.id);
                                        setIsMobileOpen(false);
                                    }}
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
    </>
  );
};

export default FeedSelector;
