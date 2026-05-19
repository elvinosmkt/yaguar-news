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

// GNews truncates content: "texto... [2821 chars]" — remove the marker
function cleanContent(raw: string): string {
  return raw.replace(/\.\.\.\s*\[\d+\s*chars?\]$/i, '...').trim();
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function fetchCategoryNews(
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
  if (!res.ok) throw new Error(`GNews ${res.status}: ${res.statusText}`);

  const data: GNewsResponse = await res.json();
  return data.articles.map((a) => ({
    id: makeId(a.url),
    title: a.title,
    description: a.description ?? '',
    content: cleanContent(a.content ?? a.description ?? ''),
    url: a.url,
    image: a.image,
    publishedAt: a.publishedAt,
    source: a.source,
    category,
  }));
}

// GNews free tier: 1 request/second — fetch sequentially to avoid rate limit errors
export async function fetchAllCategories(config: NewsSDKConfig): Promise<ArticlesMap> {
  const categories = config.categories ?? (['geral', 'politica', 'esportes', 'economia', 'tecnologia'] as NewsCategory[]);
  const map = emptyArticlesMap();
  for (let i = 0; i < categories.length; i++) {
    try {
      map[categories[i]] = await fetchCategoryNews(categories[i], config);
    } catch {
      map[categories[i]] = [];
    }
    if (i < categories.length - 1) await delay(1200);
  }
  return map;
}
