import React from 'react';
import styles from './NewsCard.module.css';

interface Article {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  source: string;
}

interface NewsCardProps {
  article: Article;
}

const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
  const date = new Date(article.pubDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <article className={styles.card}>
      <div className={styles.meta}>
        <span className={styles.source}>{article.source}</span>
        <span className={styles.date}>{date}</span>
      </div>
      <h2 className={styles.title}>
        <a href={article.link} target="_blank" rel="noopener noreferrer">
          {article.title}
        </a>
      </h2>
      <p className={styles.snippet}>
        {article.contentSnippet?.substring(0, 150)}...
      </p>
      <div className={styles.actions}>
        <a href={article.link} target="_blank" rel="noopener noreferrer" className={styles.readMore}>
          Read Article &rarr;
        </a>
      </div>
    </article>
  );
};

export default NewsCard;
