// Vercel Edge Function — tenta GNews (por busca de palavras-chave) → NewsAPI como fallback
export const config = { runtime: 'edge' };

// GNews: usa /search com palavras-chave para filtrar conteúdo real por categoria
// (top-headlines por tópico retorna o mesmo pool de notícias gerais do Brasil)
const GNEWS_QUERIES: Record<string, string> = {
  geral:      'brasil notícias hoje',
  politica:   'política governo congresso eleições senado câmara presidência',
  esportes:   'esportes futebol campeonato atleta copa brasileirão',
  economia:   'economia dólar bolsa inflação PIB mercado financeiro selic',
  tecnologia: 'tecnologia startup inovação inteligência artificial IA software',
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

  const query = GNEWS_QUERIES[category] ?? 'brasil notícias';
  const p = new URLSearchParams({
    q:       query,
    lang:    'pt',
    country: 'br',
    max:     String(max),
    in:      'title,description',
    apikey:  key,
  });

  // Usa /search para filtrar por palavras-chave → conteúdo relevante por categoria
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

async function tryNewsAPI(category: string, max: number): Promise<Article[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) throw new Error('NEWSAPI_KEY não configurada');

  const NEWSAPI_KEYWORDS: Record<string, string> = {
    politica:   'política governo eleições congresso senado',
    esportes:   'futebol esportes campeonato Copa',
    economia:   'economia mercado bolsa inflação PIB',
    tecnologia: 'tecnologia startup inovação inteligência artificial',
  };

  const p = new URLSearchParams({
    category: NEWSAPI_CAT[category] ?? 'general',
    country:  'br',
    pageSize: String(max),
    apiKey:   key,
  });
  if (NEWSAPI_KEYWORDS[category]) {
    p.set('q', NEWSAPI_KEYWORDS[category]);
  }

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
    'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
    'Content-Type': 'application/json',
  };

  // 1️⃣ Tenta GNews
  try {
    const articles = await tryGNews(category, max);
    return Response.json({ totalArticles: articles.length, articles, source: 'gnews' }, { headers });
  } catch (e) {
    console.warn('[YaguarNews] GNews falhou:', String(e));
  }

  // 2️⃣ Fallback: NewsAPI
  try {
    const articles = await tryNewsAPI(category, max);
    return Response.json({ totalArticles: articles.length, articles, source: 'newsapi' }, { headers });
  } catch (e) {
    console.warn('[YaguarNews] NewsAPI falhou:', String(e));
  }

  // Sem notícias — retorna vazio sem erro HTTP para o cliente tratar
  return Response.json({ totalArticles: 0, articles: [], source: 'none' }, { headers });
}
