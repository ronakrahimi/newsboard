import React from 'react';
import styles from './NewsCard.module.css';
import { useFeed } from '@/app/store/FeedContext';

interface Article {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  content?: string;
  source: string;
}

interface NewsCardProps {
  article: Article;
}

const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
  const { setSelectedArticle } = useFeed();

  const date = new Date(article.pubDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleClick = (e: React.MouseEvent) => {
      // Allow opening in new tab if cmd/ctrl clicked
      if (e.metaKey || e.ctrlKey) return;
      
      e.preventDefault();
      setSelectedArticle(article);
  };

  return (
    <article className={styles.card} onClick={handleClick}>
      <div className={styles.meta}>
        <span className={styles.source}>{article.source}</span>
        <span className={styles.date}>{date}</span>
      </div>
      <h2 className={styles.title}>
        <a href={article.link} onClick={handleClick}>
          {article.title}
        </a>
      </h2>
      <p className={styles.snippet}>
        {article.contentSnippet?.substring(0, 150)}...
      </p>
      <div className={styles.actions}>
        <button className={styles.readMore} onClick={handleClick}>
          Read Article &rarr;
        </button>
      </div>
    </article>
  );
};

export default NewsCard;
