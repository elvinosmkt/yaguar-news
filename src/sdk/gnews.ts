import { NewsArticle, NewsCategory, NewsSDKConfig, ArticlesMap, emptyArticlesMap } from './types';

const GNEWS_CATEGORY_MAP: Record<NewsCategory, string> = {
  politica: 'nation',
  esportes: 'sports',
  economia: 'business',
  tecnologia: 'technology',
  geral: 'breaking-news',
};

interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

function makeId(url: string): string {
  try {
    return btoa(encodeURIComponent(url)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function cleanGNewsContent(raw: string): string {
  return raw.replace(/\.\.\.\s*\[\d+\s*chars?\]$/i, '...').trim();
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Fonte primária: GNews.io ───────────────────────────────────────────────
async function fetchFromGNews(
  category: NewsCategory,
  config: NewsSDKConfig
): Promise<NewsArticle[]> {
  const { apiKey, language = 'pt', country = 'br', maxArticlesPerCategory = 10 } = config;

  const params = new URLSearchParams({
    category: GNEWS_CATEGORY_MAP[category],
    lang: language,
    country,
    max: String(maxArticlesPerCategory),
    apikey: apiKey,
  });

  const res = await fetch(`https://gnews.io/api/v4/top-headlines?${params}`);
  if (!res.ok) throw new Error(`GNews ${res.status}`);

  const data: GNewsResponse = await res.json();
  if (!data.articles?.length) throw new Error('GNews: sem artigos');

  return data.articles.map((a) => ({
    id: makeId(a.url),
    title: a.title,
    description: a.description ?? '',
    content: cleanGNewsContent(a.content ?? a.description ?? ''),
    url: a.url,
    image: a.image,
    publishedAt: a.publishedAt,
    source: a.source,
    category,
  }));
}

// ── Fonte reserva: NewsAPI.org via Edge Function /api/news ─────────────────
async function fetchFromNewsAPI(
  category: NewsCategory,
  config: NewsSDKConfig
): Promise<NewsArticle[]> {
  const max = config.maxArticlesPerCategory ?? 10;
  const params = new URLSearchParams({ category, max: String(max) });

  const res = await fetch(`/api/news?${params}`);
  if (!res.ok) throw new Error(`NewsAPI proxy ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.articles ?? []).map((a: any) => ({
    id: makeId(a.url),
    title: a.title,
    description: a.description ?? '',
    content: a.content ?? '',
    url: a.url,
    image: a.image,
    publishedAt: a.publishedAt,
    source: a.source,
    category,
  }));
}

// ── fetchCategoryNews: tenta GNews, cai no NewsAPI se falhar ───────────────
export async function fetchCategoryNews(
  category: NewsCategory,
  config: NewsSDKConfig
): Promise<NewsArticle[]> {
  try {
    return await fetchFromGNews(category, config);
  } catch (primaryErr) {
    console.warn(`[YaguarNews] GNews falhou para "${category}", tentando NewsAPI...`, primaryErr);
    try {
      return await fetchFromNewsAPI(category, config);
    } catch (fallbackErr) {
      console.error(`[YaguarNews] NewsAPI também falhou para "${category}"`, fallbackErr);
      return [];
    }
  }
}

// ── Busca todas as categorias sequencialmente (rate limit: 1 req/s) ────────
export async function fetchAllCategories(config: NewsSDKConfig): Promise<ArticlesMap> {
  const categories = config.categories ??
    (['geral', 'politica', 'esportes', 'economia', 'tecnologia'] as NewsCategory[]);
  const map = emptyArticlesMap();

  for (let i = 0; i < categories.length; i++) {
    map[categories[i]] = await fetchCategoryNews(categories[i], config);
    if (i < categories.length - 1) await delay(1200);
  }

  return map;
}
