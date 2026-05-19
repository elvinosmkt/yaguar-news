import React from 'react';
import { NewsCategory, NEWS_CATEGORIES } from './types';
import { UseNewsReturn } from './useNews';
import { NewsCard } from './NewsCard';
import { NewsModal } from './NewsModal';
import { CategoryFilter } from './CategoryFilter';
import { formatLastUpdated } from './scheduler';

interface Props { news: UseNewsReturn; title?: string; }

function Skeleton() {
  return (
    <div className="yn-card yn-card--skeleton" aria-hidden>
      <div className="yn-sk yn-sk--img" />
      <div className="yn-card__body">
        <div className="yn-sk yn-sk--title" />
        <div className="yn-sk yn-sk--text" />
        <div className="yn-sk yn-sk--text yn-sk--short" />
      </div>
    </div>
  );
}

export function NewsFeed({ news, title = 'Notícias' }: Props) {
  const { articles, loading, error, lastUpdated, refresh,
    selectedCategory, setCategory, selectedArticle, selectArticle } = news;

  const counts = NEWS_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = articles[cat]?.length ?? 0; return acc;
  }, {} as Partial<Record<NewsCategory, number>>);

  const current = articles[selectedCategory] ?? [];

  return (
    <section className="yn-feed">
      <header className="yn-feed__header">
        <div>
          <h2 className="yn-feed__title">{title}</h2>
          {lastUpdated && (
            <span className="yn-feed__updated">Atualizado: {formatLastUpdated(lastUpdated)}</span>
          )}
        </div>
        <button className="yn-feed__refresh" onClick={refresh} disabled={loading}>
          {loading ? '⟳' : '↻'} Atualizar
        </button>
      </header>

      <CategoryFilter selected={selectedCategory} onChange={setCategory} counts={counts} />

      {error && (
        <div className="yn-error" role="alert">
          <span>⚠ {error}</span>
          <button onClick={refresh} className="yn-error__retry">Tentar novamente</button>
        </div>
      )}

      <div className="yn-grid">
        {loading && current.length === 0
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
          : current.map((a) => <NewsCard key={a.id} article={a} onClick={selectArticle} />)}

        {!loading && current.length === 0 && !error && (
          <div className="yn-empty">
            <p>Nenhuma notícia encontrada.</p>
            <button onClick={refresh} className="yn-empty__btn">Carregar notícias</button>
          </div>
        )}
      </div>

      <NewsModal article={selectedArticle} onClose={() => selectArticle(null)} />
    </section>
  );
}
