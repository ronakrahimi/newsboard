import React, { useEffect, useRef } from 'react';
import { useFeed } from '@/app/store/FeedContext';
import DOMPurify from 'isomorphic-dompurify';
import styles from './ArticleReader.module.css';

const ArticleReader: React.FC = () => {
  const { selectedArticle, setSelectedArticle } = useFeed();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedArticle(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setSelectedArticle]);

  // Lock body scroll when open
  useEffect(() => {
    if (selectedArticle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedArticle]);

  const [viewMode, setViewMode] = React.useState<'text' | 'web'>('text');

  // Reset view mode when opening a new article
  React.useEffect(() => {
    if (selectedArticle) {
      setViewMode('text');
    }
  }, [selectedArticle]);

  if (!selectedArticle) return null;

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setSelectedArticle(null);
    }
  };

  const formatDate = (dateString: string) => {
      try {
          return new Date(dateString).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
          });
      } catch (e) {
          return "";
      }
  };

  return (
    <div className={styles.overlay} onClick={handleOutsideClick}>
      <div className={styles.modal} ref={modalRef}>
        <div className={styles.header}>
          <span className={styles.source}>{selectedArticle.source}</span>
          <button 
            className={styles.closeBtn} 
            onClick={() => setSelectedArticle(null)}
            aria-label="Close reader"
          >
            &times;
          </button>
        </div>

        <div className={styles.content}>
          <h1 className={styles.title}>
            <a href={selectedArticle.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              {selectedArticle.title}
            </a>
          </h1>
          <span className={styles.meta}>
            {formatDate(selectedArticle.pubDate)}
          </span>

          <div className={styles.viewControls}>
            <button 
              className={`${styles.viewToggle} ${viewMode === 'text' ? styles.active : ''}`}
              onClick={() => setViewMode('text')}
            >
              Rx Reader View
            </button>
            <button 
              className={`${styles.viewToggle} ${viewMode === 'web' ? styles.active : ''}`}
              onClick={() => setViewMode('web')}
            >
              Web View
            </button>
          </div>
          
          <div className={styles.body}>
            {viewMode === 'text' ? (
              <div 
                className={styles.articleBody}
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(selectedArticle.content || selectedArticle.contentSnippet || "No preview available.") 
                }} 
              />
            ) : (
              <div className={styles.iframeContainer}>
                 <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '10px', textAlign: 'center'}}>
                    Note: Some sites (like NYT, Hollywood Reporter) block embedding. If screens are gray, use the external link.
                 </p>
                <iframe 
                  src={selectedArticle.link} 
                  className={styles.iframe}
                  title="Article Content"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleReader;
