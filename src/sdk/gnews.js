import { emptyArticlesMap } from './types';
const GNEWS_CATEGORY_MAP = {
    politica: 'nation',
    esportes: 'sports',
    economia: 'business',
    tecnologia: 'technology',
    geral: 'breaking-news',
};
function makeId(url) {
    try {
        return btoa(encodeURIComponent(url)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
    }
    catch {
        return Math.random().toString(36).slice(2);
    }
}
export async function fetchCategoryNews(category, config) {
    const { apiKey, language = 'pt', country = 'br', maxArticlesPerCategory = 10 } = config;
    const params = new URLSearchParams({
        category: GNEWS_CATEGORY_MAP[category],
        lang: language,
        country,
        max: String(maxArticlesPerCategory),
        apikey: apiKey,
    });
    const res = await fetch(`https://gnews.io/api/v4/top-headlines?${params}`);
    if (!res.ok)
        throw new Error(`GNews ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return data.articles.map((a) => ({
        id: makeId(a.url),
        title: a.title,
        description: a.description ?? '',
        content: a.content ?? a.description ?? '',
        url: a.url,
        image: a.image,
        publishedAt: a.publishedAt,
        source: a.source,
        category,
    }));
}
export async function fetchAllCategories(config) {
    const categories = config.categories ?? ['geral', 'politica', 'esportes', 'economia', 'tecnologia'];
    const results = await Promise.allSettled(categories.map((cat) => fetchCategoryNews(cat, config)));
    const map = emptyArticlesMap();
    results.forEach((r, i) => {
        if (r.status === 'fulfilled')
            map[categories[i]] = r.value;
    });
    return map;
}
