// Vercel Edge Function — tenta GNews → WorldNewsAPI → NewsAPI
export const config = { runtime: 'edge' };

// Cada categoria busca por palavra única no TÍTULO (in=title) — evita overlap.
// ex: artigo de futebol que menciona "economia" no corpo NÃO aparece em economia.
// geral usa busca ampla (sem in=title) para pegar o que as outras não cobrem.
const GNEWS_CONFIG: Record<string, { q: string; inTitle: boolean }> = {
  geral:      { q: 'brasil',     inTitle: false },
  politica:   { q: 'governo',   inTitle: true  },
  esportes:   { q: 'futebol',   inTitle: true  },
  economia:   { q: 'economia',  inTitle: true  },
  tecnologia: { q: 'tecnologia',inTitle: true  },
};

const NEWSAPI_CAT: Record<string, string> = {
  geral:      'general',
  politica:   'general',
  esportes:   'sports',
  economia:   'business',
  tecnologia: 'technology',
};

interface Article {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
}

function clean(raw: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/\[\+\d+\s*chars?\]/gi, '')
    .replace(/\.\.\.\s*\[\d+\s*chars?\]$/i, '...')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function tryGNews(category: string, max: number): Promise<Article[]> {
  const key =
    process.env.GNEWS_KEY ??
    process.env.GNEWS_API_KEY ??
    process.env.VITE_GNEWS_API_KEY;
  if (!key) throw new Error('GNEWS_KEY não configurada');

  const cfg = GNEWS_CONFIG[category] ?? { q: 'brasil', inTitle: false };
  const p = new URLSearchParams({
    q:       cfg.q,
    lang:    'pt',
    country: 'br',
    max:     String(max),
    apikey:  key,
  });
  if (cfg.inTitle) p.set('in', 'title');
  const res = await fetch(`https://gnews.io/api/v4/search?${p}`, {
    headers: { 'User-Agent': 'YaguarNews/1.0' },
  });
  if (!res.ok) throw new Error(`GNews HTTP ${res.status}`);

  const data = await res.json();
  const arts: any[] = data.articles ?? [];
  if (!arts.length) throw new Error('GNews retornou 0 artigos');

  return arts
    .filter((a) => a.title && a.url)
    .map((a) => ({
      title:       a.title,
      description: a.description ?? '',
      content:     clean(a.content) || clean(a.description),
      url:         a.url,
      image:       a.image ?? null,
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      source:      a.source ?? { name: '', url: '' },
    }));
}

// Termos de busca para WorldNewsAPI (suporta múltiplas palavras com OR implícito)
const WORLDNEWS_TERMS: Record<string, string> = {
  geral:      'brasil notícias',
  politica:   'política governo',
  esportes:   'futebol esportes',
  economia:   'economia mercado',
  tecnologia: 'tecnologia',
};

async function tryWorldNewsAPI(category: string, max: number): Promise<Article[]> {
  const key = process.env.WORLDNEWS_API_KEY;
  if (!key) throw new Error('WORLDNEWS_API_KEY não configurada');

  const text = WORLDNEWS_TERMS[category] ?? 'brasil';
  const p = new URLSearchParams({
    text,
    'source-countries': 'br',
    language:           'pt',
    number:             String(max),
    'api-key':          key,
  });

  const res = await fetch(`https://api.worldnewsapi.com/search-news?${p}`, {
    headers: { 'User-Agent': 'YaguarNews/1.0' },
  });
  if (!res.ok) throw new Error(`WorldNewsAPI HTTP ${res.status}`);

  const data = await res.json();
  const arts: any[] = data.news ?? [];
  if (!arts.length) throw new Error('WorldNewsAPI retornou 0 artigos');

  return arts
    .filter((a) => a.title && a.url)
    .map((a) => ({
      title:       a.title,
      description: clean(a.summary) || clean(a.text?.slice(0, 200)),
      content:     clean(a.text),
      url:         a.url,
      image:       a.image ?? null,
      publishedAt: a.publish_date ?? new Date().toISOString(),
      source:      { name: a.source_country ?? 'Brasil', url: '' },
    }));
}

async function tryNewsAPI(category: string, max: number): Promise<Article[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) throw new Error('NEWSAPI_KEY não configurada');

  const p = new URLSearchParams({
    category: NEWSAPI_CAT[category] ?? 'general',
    country:  'br',
    pageSize: String(max),
    apiKey:   key,
  });

  const res = await fetch(`https://newsapi.org/v2/top-headlines?${p}`, {
    headers: { 'User-Agent': 'YaguarNews/1.0' },
  });
  if (!res.ok) throw new Error(`NewsAPI HTTP ${res.status}`);

  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message ?? 'NewsAPI erro');

  const arts: any[] = (data.articles ?? []).filter(
    (a: any) => a.title && a.title !== '[Removed]' && a.url
  );
  if (!arts.length) throw new Error('NewsAPI retornou 0 artigos');

  return arts.map((a) => ({
    title:       a.title,
    description: a.description ?? '',
    content:     clean(a.content) || clean(a.description),
    url:         a.url,
    image:       a.urlToImage ?? null,
    publishedAt: a.publishedAt ?? new Date().toISOString(),
    source:      { name: a.source?.name ?? '', url: '' },
  }));
}

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? 'geral';
  const max = Math.min(parseInt(searchParams.get('max') ?? '10', 10), 20);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  };

  // 1️⃣ Tenta GNews
  try {
    const articles = await tryGNews(category, max);
    return Response.json({ totalArticles: articles.length, articles, source: 'gnews' }, { headers });
  } catch (e) {
    console.warn('[YaguarNews] GNews falhou:', String(e));
  }

  // 2️⃣ Fallback: WorldNewsAPI
  try {
    const articles = await tryWorldNewsAPI(category, max);
    return Response.json({ totalArticles: articles.length, articles, source: 'worldnews' }, { headers });
  } catch (e) {
    console.warn('[YaguarNews] WorldNewsAPI falhou:', String(e));
  }

  // 3️⃣ Fallback: NewsAPI
  try {
    const articles = await tryNewsAPI(category, max);
    return Response.json({ totalArticles: articles.length, articles, source: 'newsapi' }, { headers });
  } catch (e) {
    console.warn('[YaguarNews] NewsAPI falhou:', String(e));
  }

  // Sem notícias — retorna vazio sem erro HTTP para o cliente tratar
  return Response.json({ totalArticles: 0, articles: [], source: 'none' }, { headers });
}
