import { useState, useEffect, useCallback, useRef } from 'react';
import { emptyArticlesMap } from './types';
import { fetchAllCategories } from './gnews';
import { shouldFetchNow, msUntilNext } from './scheduler';
const PREFIX = 'crm_news_v1_';
const CATS = ['geral', 'politica', 'esportes', 'economia', 'tecnologia'];
function readCache() {
    const articles = emptyArticlesMap();
    for (const cat of CATS) {
        try {
            const raw = localStorage.getItem(`${PREFIX}${cat}`);
            if (raw)
                articles[cat] = JSON.parse(raw);
        }
        catch { /* skip */ }
    }
    const ts = localStorage.getItem(`${PREFIX}last_fetch`);
    return { articles, lastFetch: ts ? parseInt(ts, 10) : null };
}
function writeCache(articles) {
    for (const [cat, items] of Object.entries(articles)) {
        localStorage.setItem(`${PREFIX}${cat}`, JSON.stringify(items));
    }
    localStorage.setItem(`${PREFIX}last_fetch`, String(Date.now()));
}
export function useNews(config) {
    const scheduleHours = config.scheduleHours ?? [6, 15];
    const cached = readCache();
    const [state, setState] = useState({
        articles: cached.articles,
        loading: false,
        error: null,
        lastUpdated: cached.lastFetch,
    });
    const [selectedCategory, setCategory] = useState('geral');
    const [selectedArticle, selectArticle] = useState(null);
    const timerRef = useRef(null);
    const configRef = useRef(config);
    configRef.current = config;
    const fetchNews = useCallback(async () => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const articles = await fetchAllCategories(configRef.current);
            writeCache(articles);
            setState({ articles, loading: false, error: null, lastUpdated: Date.now() });
        }
        catch (err) {
            setState((s) => ({
                ...s,
                loading: false,
                error: err instanceof Error ? err.message : 'Erro ao buscar notícias',
            }));
        }
    }, []);
    const scheduleNext = useCallback(() => {
        if (timerRef.current)
            clearTimeout(timerRef.current);
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
        }
        else {
            scheduleNext();
        }
        return () => { if (timerRef.current)
            clearTimeout(timerRef.current); };
    }, []);
    return { ...state, refresh: fetchNews, selectedCategory, setCategory, selectedArticle, selectArticle };
}
