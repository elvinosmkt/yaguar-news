import React from 'react';
import { NewsArticle, CATEGORY_LABELS, CATEGORY_COLORS } from './types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 60) return `${m}min atrás`;
  if (h < 24) return `${h}h atrás`;
  return `${d}d atrás`;
}

interface Props { article: NewsArticle; onClick: (a: NewsArticle) => void; }

export function NewsCard({ article, onClick }: Props) {
  const color = CATEGORY_COLORS[article.category];
  return (
    <article className="yn-card" onClick={() => onClick(article)} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(article)}>
      <div className="yn-card__img-wrap">
        {article.image
          ? <img src={article.image} alt="" className="yn-card__img" loading="lazy" />
          : <div className="yn-card__img-ph">📰</div>}
        <span className="yn-card__badge" style={{ background: color }}>
          {CATEGORY_LABELS[article.category]}
        </span>
      </div>
      <div className="yn-card__body">
        <h3 className="yn-card__title">{article.title}</h3>
        <p className="yn-card__desc">{article.description}</p>
        <footer className="yn-card__footer">
          <span className="yn-card__source">{article.source.name}</span>
          <span className="yn-card__time">{timeAgo(article.publishedAt)}</span>
        </footer>
      </div>
    </article>
  );
}
