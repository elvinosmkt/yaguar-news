import React, { useEffect } from 'react';
import { NewsArticle, CATEGORY_LABELS, CATEGORY_COLORS } from './types';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

interface Props { article: NewsArticle | null; onClose: () => void; }

export function NewsModal({ article, onClose }: Props) {
  useEffect(() => {
    if (!article) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [article, onClose]);

  if (!article) return null;
  const color = CATEGORY_COLORS[article.category];

  return (
    <div className="yn-overlay" onClick={(e) => e.currentTarget === e.target && onClose()}
      role="dialog" aria-modal="true" aria-labelledby="yn-modal-title">
      <div className="yn-modal">
        <button className="yn-modal__close" onClick={onClose} aria-label="Fechar">✕</button>

        <span className="yn-modal__badge" style={{ background: color }}>
          {CATEGORY_LABELS[article.category]}
        </span>

        {article.image && <img src={article.image} alt="" className="yn-modal__img" />}

        <h2 id="yn-modal-title" className="yn-modal__title">{article.title}</h2>

        <div className="yn-modal__meta">
          <span className="yn-modal__source">{article.source.name}</span>
          <span className="yn-modal__date">{fmt(article.publishedAt)}</span>
        </div>

        <p className="yn-modal__content">{article.content}</p>

        <a href={article.url} target="_blank" rel="noopener noreferrer"
          className="yn-modal__cta" style={{ background: color }}>
          Ler matéria completa →
        </a>
      </div>
    </div>
  );
}
