import { useState, useEffect, useCallback, useRef } from 'react';
import { NewsArticle, NewsCategory, NewsSDKConfig, NewsState, ArticlesMap, emptyArticlesMap } from './types';
import { fetchAllCategories } from './gnews';
import { shouldFetchNow, msUntilNext } from './scheduler';

const PREFIX = 'crm_news_v2_';
const CATS: NewsCategory[] = ['geral', 'politica', 'esportes', 'economia', 'tecnologia'];

function readCache(): { articles: ArticlesMap; lastFetch: number | null } {
  const articles = emptyArticlesMap();
  for (const cat of CATS) {
    try {
      const raw = localStorage.getItem(`${PREFIX}${cat}`);
      if (raw) articles[cat] = JSON.parse(raw);
    } catch { /* skip */ }
  }
  const ts = localStorage.getItem(`${PREFIX}last_fetch`);
  return { articles, lastFetch: ts ? parseInt(ts, 10) : null };
}

function writeCache(articles: ArticlesMap) {
  for (const [cat, items] of Object.entries(articles)) {
    localStorage.setItem(`${PREFIX}${cat}`, JSON.stringify(items));
  }
  localStorage.setItem(`${PREFIX}last_fetch`, String(Date.now()));
}

function hasCachedArticles(articles: ArticlesMap): boolean {
  return CATS.some((cat) => articles[cat].length > 0);
}

export interface UseNewsReturn extends NewsState {
  refresh: () => void;
  selectedCategory: NewsCategory;
  setCategory: (cat: NewsCategory) => void;
  selectedArticle: NewsArticle | null;
  selectArticle: (a: NewsArticle | null) => void;
}

export function useNews(config: NewsSDKConfig): UseNewsReturn {
  const scheduleHours = config.scheduleHours ?? [6, 15];
  const cached = readCache();

  // Se não há cache, começa com loading=true para mostrar skeletons imediatamente
  const [state, setState] = useState<NewsState>({
    articles: cached.articles,
    loading: !hasCachedArticles(cached.articles),
    error: null,
    lastUpdated: cached.lastFetch,
  });
  const [selectedCategory, setCategory] = useState<NewsCategory>('geral');
  const [selectedArticle, selectArticle] = useState<NewsArticle | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const fetchNews = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const articles = await fetchAllCategories(configRef.current);
      // Verifica se pelo menos uma categoria teve artigos
      const hasAny = CATS.some((c) => articles[c].length > 0);
      if (hasAny) writeCache(articles);
      setState({ articles, loading: false, error: null, lastUpdated: hasAny ? Date.now() : null });
      if (!hasAny) {
        setState((s) => ({ ...s, error: 'Nenhuma notícia retornada pelas fontes. Tente atualizar.' }));
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar notícias',
      }));
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = msUntilNext({ hours: scheduleHours });
    timerRef.current = setTimeout(async () => {
      await fetchNews();
      scheduleNext();
    }, delay);
  }, [fetchNews]);

  useEffect(() => {
    const { lastFetch } = readCache();
    if (shouldFetchNow(lastFetch, { hours: scheduleHours })) {
      fetchNews().then(scheduleNext);
    } else {
      scheduleNext();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { ...state, refresh: fetchNews, selectedCategory, setCategory, selectedArticle, selectArticle };
}
