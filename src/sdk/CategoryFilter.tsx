import React from 'react';
import { NewsCategory, NEWS_CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS } from './types';

interface Props {
  selected: NewsCategory;
  onChange: (cat: NewsCategory) => void;
  categories?: NewsCategory[];
  counts?: Partial<Record<NewsCategory, number>>;
}

export function CategoryFilter({ selected, onChange, categories = NEWS_CATEGORIES, counts }: Props) {
  return (
    <nav className="yn-filter">
      {categories.map((cat) => {
        const active = selected === cat;
        const color = CATEGORY_COLORS[cat];
        return (
          <button key={cat} className={`yn-filter__btn${active ? ' yn-filter__btn--active' : ''}`}
            style={active ? { background: color, borderColor: color, color: '#fff' } : { borderColor: color, color }}
            onClick={() => onChange(cat)} aria-pressed={active}>
            {CATEGORY_LABELS[cat]}
            {counts?.[cat] !== undefined && (
              <span className="yn-filter__count">{counts[cat]}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
