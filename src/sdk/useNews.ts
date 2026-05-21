import { useState, useEffect, useCallback, useRef } from 'react';
import { NewsArticle, NewsCategory, NewsSDKConfig, NewsState, ArticlesMap, emptyArticlesMap } from './types';
import { fetchAllCategories } from './gnews';
import { shouldFetchNow, msUntilNext } from './scheduler';
import { prefetchSummaries } from './summaryCache';

// Bump de versão invalida cache antigo corrompido no localStorage
const PREFIX = 'crm_news_v4_';
const CATS: NewsCategory[] = ['geral', 'politica', 'esportes', 'economia', 'tecnologia'];
const STALE_MS = 30 * 60 * 1000; // 30 minutos

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

// Considera cache válido só se a MAIORIA das categorias tem artigos
function hasCachedArticles(articles: ArticlesMap): boolean {
  const filled = CATS.filter((cat) => articles[cat].length > 0).length;
  return filled >= Math.ceil(CATS.length / 2);
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
      const hasAny = CATS.some((c) => articles[c].length > 0);
      if (hasAny) {
        writeCache(articles);
        // Pré-gera resumos em background — não bloqueia a UI
        const allArticles = CATS.flatMap(c => articles[c]);
        const summarizeUrl = configRef.current.summarizeUrl ?? '/api/summarize';
        prefetchSummaries(allArticles, summarizeUrl).catch(() => {/* silencioso */});
      }
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

  // Fetch inicial: busca se cache inválido ou horário agendado passou
  useEffect(() => {
    const { lastFetch } = readCache();
    if (!hasCachedArticles(cached.articles) || shouldFetchNow(lastFetch, { hours: scheduleHours })) {
      fetchNews().then(scheduleNext);
    } else {
      scheduleNext();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Auto-refresh ao voltar ao tab se dados tiverem mais de 30 minutos
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const { lastFetch } = readCache();
      if (!lastFetch || Date.now() - lastFetch > STALE_MS) {
        fetchNews();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchNews]);

  return { ...state, refresh: fetchNews, selectedCategory, setCategory, selectedArticle, selectArticle };
}
