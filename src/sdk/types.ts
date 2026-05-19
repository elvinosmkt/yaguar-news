export type NewsCategory = 'politica' | 'esportes' | 'economia' | 'tecnologia' | 'geral';

export const NEWS_CATEGORIES: NewsCategory[] = [
  'geral',
  'politica',
  'esportes',
  'economia',
  'tecnologia',
];

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  geral: 'Geral',
  politica: 'Política',
  esportes: 'Esportes',
  economia: 'Economia',
  tecnologia: 'Tecnologia',
};

export const CATEGORY_COLORS: Record<NewsCategory, string> = {
  geral: '#64748b',
  politica: '#dc2626',
  esportes: '#16a34a',
  economia: '#2563eb',
  tecnologia: '#7c3aed',
};

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
  category: NewsCategory;
}

export interface NewsState {
  articles: Record<NewsCategory, NewsArticle[]>;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export interface NewsSDKConfig {
  apiKey: string;
  language?: string;
  country?: string;
  maxArticlesPerCategory?: number;
  scheduleHours?: number[];
  categories?: NewsCategory[];
}

export type ArticlesMap = Record<NewsCategory, NewsArticle[]>;

export function emptyArticlesMap(): ArticlesMap {
  return { geral: [], politica: [], esportes: [], economia: [], tecnologia: [] };
}
