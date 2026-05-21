export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Busca o texto completo do artigo via Jina AI Reader (gratuito, sem chave)
async function fetchFullText(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text',
        'User-Agent': 'YaguarNews/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Limita a 4000 chars para não estourar o contexto da IA
    return text.slice(0, 4000).trim() || null;
  } catch {
    return null;
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: CORS });
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return Response.json({ error: 'OPENROUTER_API_KEY não configurada' }, { status: 500, headers: CORS });
  }

  let title = '', description = '', content = '', url = '';
  try {
    const body = await request.json();
    title       = body.title       ?? '';
    description = body.description ?? '';
    content     = body.content     ?? '';
    url         = body.url         ?? '';
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400, headers: CORS });
  }

  // Tenta buscar o texto completo do artigo original
  const fullText = url ? await fetchFullText(url) : null;

  // Monta o texto para a IA — prioriza o artigo completo, cai no trecho da API
  let articleText: string;
  let source: 'full' | 'partial';

  if (fullText && fullText.length > 300) {
    articleText = fullText;
    source = 'full';
  } else {
    articleText = [
      title       ? `Título: ${title}`       : '',
      description ? `Descrição: ${description}` : '',
      content     ? `Conteúdo: ${content}`   : '',
    ].filter(Boolean).join('\n\n');
    source = 'partial';
  }

  const prompt = `Você é um jornalista brasileiro experiente. Com base no texto abaixo, escreva um resumo completo da notícia em português.

Regras:
- Escreva entre 3 e 5 parágrafos curtos e objetivos
- Comece com o fato principal (quem, o quê, quando, onde)
- Inclua contexto, causas e impacto quando disponível no texto
- Linguagem clara e direta, sem rebuscamento
- Não invente dados que não estejam no texto original
- Não use frases como "com base no texto" ou "o artigo diz" — escreva como notícia

Texto da notícia:
${articleText}

Resumo:`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://yaguar-news.vercel.app',
        'X-Title': 'Yaguar News',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v4-flash:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `OpenRouter erro ${res.status}: ${err}` }, { status: 502, headers: CORS });
    }

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content?.trim() ?? '';

    return Response.json({ summary, source }, { headers: CORS });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: CORS });
  }
}
