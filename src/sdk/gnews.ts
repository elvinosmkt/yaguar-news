import { NewsArticle, NewsCategory, NewsSDKConfig, ArticlesMap, emptyArticlesMap } from './types';

// Hash djb2 — gera ID único a partir da URL completa, sem risco de colisão
function makeId(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = (((h << 5) + h) ^ url.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

// Normaliza URL para comparação: remove parâmetros de rastreamento e trailing slash
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.toLowerCase().replace(/\/$/, '');
  } catch {
    return url.toLowerCase().replace(/\/$/, '');
  }
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function fetchFromProxy(
  category: NewsCategory,
  config: NewsSDKConfig
): Promise<NewsArticle[]> {
  const max = config.maxArticlesPerCategory ?? 10;
  const params = new URLSearchParams({ category, max: String(max) });
  const base = config.proxyUrl ?? '/api/news';

  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error(`Proxy retornou ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.articles ?? []).map((a: any) => ({
    id:          makeId(a.url),
    title:       a.title ?? '',
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

function dedupWithin(articles: NewsArticle[]): NewsArticle[] {
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  return articles.filter(a => {
    const urlKey = normalizeUrl(a.url);
    const titleKey = a.title.toLowerCase().trim().slice(0, 80);
    if (seenUrl.has(urlKey) || seenTitle.has(titleKey)) return false;
    seenUrl.add(urlKey);
    seenTitle.add(titleKey);
    return true;
  });
}

// Sequencial para respeitar rate limit do GNews (1 req/s no plano free)
export async function fetchAllCategories(config: NewsSDKConfig): Promise<ArticlesMap> {
  const categories: NewsCategory[] = config.categories ??
    ['geral', 'politica', 'esportes', 'economia', 'tecnologia'];
  const map = emptyArticlesMap();

  for (let i = 0; i < categories.length; i++) {
    const raw = await fetchCategoryNews(categories[i], config);
    // Remove duplicatas dentro da mesma categoria (por URL e por título)
    map[categories[i]] = dedupWithin(raw);
    if (i < categories.length - 1) await delay(1200);
  }

  // Remove duplicatas entre categorias — artigo fica na sua categoria de origem
  // Prioridade: categorias específicas têm precedência sobre "geral"
  const globalSeen = new Set<string>();
  const priority: NewsCategory[] = ['tecnologia', 'economia', 'esportes', 'politica', 'geral'];
  for (const cat of priority) {
    map[cat] = map[cat].filter(a => {
      const key = normalizeUrl(a.url);
      if (globalSeen.has(key)) return false;
      globalSeen.add(key);
      return true;
    });
  }

  return map;
}
