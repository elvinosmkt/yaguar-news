// Vercel Edge Function — proxy para NewsAPI.org (resolve CORS no browser)
export const config = { runtime: 'edge' };

const NEWSAPI_MAP: Record<string, string> = {
  geral: 'general',
  politica: 'general',
  esportes: 'sports',
  economia: 'business',
  tecnologia: 'technology',
};

interface NewsAPIArticle {
  source: { name: string };
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

function cleanContent(raw: string | null): string {
  if (!raw) return '';
  return raw.replace(/\[\+\d+\s*chars?\]/gi, '').replace(/\s{2,}/g, ' ').trim();
}

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? 'geral';
  const country  = searchParams.get('country')  ?? 'br';
  const max      = searchParams.get('max')       ?? '10';

  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    return Response.json({ error: 'NEWSAPI_KEY not configured' }, { status: 500 });
  }

  const params = new URLSearchParams({
    category: NEWSAPI_MAP[category] ?? 'general',
    country,
    pageSize: max,
    apiKey,
  });

  // Política não tem categoria direta na NewsAPI — adiciona keyword
  if (category === 'politica') {
    params.set('q', 'política governo eleições congresso');
  }

  const upstream = await fetch(
    `https://newsapi.org/v2/top-headlines?${params}`,
    { headers: { 'User-Agent': 'YaguarNews/1.0' } }
  );

  const data = await upstream.json();

  if (!upstream.ok) {
    return Response.json({ error: data.message ?? 'NewsAPI error' }, { status: upstream.status });
  }

  const articles = (data.articles ?? [])
    .filter((a: NewsAPIArticle) => a.title && a.title !== '[Removed]' && a.url)
    .map((a: NewsAPIArticle) => ({
      title: a.title,
      description: a.description ?? '',
      content: cleanContent(a.content) || cleanContent(a.description),
      url: a.url,
      image: a.urlToImage,
      publishedAt: a.publishedAt,
      source: { name: a.source.name, url: '' },
    }));

  return Response.json(
    { totalArticles: data.totalResults ?? articles.length, articles },
    { headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}
