import { NewsArticle, NewsCategory, NewsSDKConfig, ArticlesMap, emptyArticlesMap } from './types';

function makeId(url: string): string {
  try {
    return btoa(encodeURIComponent(url)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// Toda busca passa pelo proxy /api/news — o servidor decide GNews vs NewsAPI
async function fetchFromProxy(
  category: NewsCategory,
  config: NewsSDKConfig
): Promise<NewsArticle[]> {
  const max = config.maxArticlesPerCategory ?? 10;
  const params = new URLSearchParams({ category, max: String(max) });

  const res = await fetch(`/api/news?${params}`);
  if (!res.ok) throw new Error(`Proxy /api/news retornou ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.articles ?? []).map((a: any) => ({
    id:          makeId(a.url),
    title:       a.title,
    description: a.description ?? '',
    content:     a.content ?? '',
    url:         a.url,
    image:       a.image ?? null,
    publishedAt: a.publishedAt,
    source:      a.source ?? { name: '', url: '' },
    category,
  }));
}

export async function fetchCategoryNews(
  category: NewsCategory,
  config: NewsSDKConfig
): Promise<NewsArticle[]> {
  try {
    return await fetchFromProxy(category, config);
  } catch (err) {
    console.error(`[YaguarNews] Falhou ao buscar "${category}":`, err);
    return [];
  }
}

// Sequencial para respeitar rate limit do GNews (1 req/s no plano free)
export async function fetchAllCategories(config: NewsSDKConfig): Promise<ArticlesMap> {
  const categories = config.categories ??
    (['geral', 'politica', 'esportes', 'economia', 'tecnologia'] as NewsCategory[]);
  const map = emptyArticlesMap();

  for (let i = 0; i < categories.length; i++) {
    map[categories[i]] = await fetchCategoryNews(categories[i], config);
    if (i < categories.length - 1) await delay(1200);
  }

  // Deduplicação: cada artigo aparece apenas na categoria mais específica.
  // Categorias específicas têm prioridade; geral recebe o que sobrar.
  const seen = new Set<string>();
  const priority: NewsCategory[] = ['tecnologia', 'economia', 'esportes', 'politica', 'geral'];
  for (const cat of priority) {
    map[cat] = map[cat].filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });
  }

  return map;
}
