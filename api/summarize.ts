export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Cadeia de modelos — tenta em ordem até um responder sem rate limit
const MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'deepseek/deepseek-v4-flash:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'minimax/minimax-m2.5:free',
  'openai/gpt-oss-20b:free',
];

// Busca o texto completo via Jina AI Reader (gratuito, sem chave)
async function fetchFullText(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'text',
        'User-Agent': 'YaguarNews/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 4000).trim() || null;
  } catch {
    return null;
  }
}

async function callOpenRouter(key: string, model: string, prompt: string): Promise<string | null> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://yaguar-news.vercel.app',
      'X-Title': 'Yaguar News',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) return null; // rate limit ou erro — tenta próximo modelo

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
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

  // Tenta buscar o texto completo — em paralelo com a preparação do fallback
  const fullText = url ? await fetchFullText(url) : null;

  const articleText = (fullText && fullText.length > 300)
    ? fullText
    : [
        title       ? `Título: ${title}`          : '',
        description ? `Descrição: ${description}` : '',
        content     ? `Conteúdo: ${content}`       : '',
      ].filter(Boolean).join('\n\n');

  const source: 'full' | 'partial' = (fullText && fullText.length > 300) ? 'full' : 'partial';

  const prompt = `Você é um jornalista brasileiro experiente. Com base no texto abaixo, escreva um resumo completo da notícia em português.

Regras:
- Escreva entre 3 e 5 parágrafos curtos e objetivos
- Comece com o fato principal (quem, o quê, quando, onde)
- Inclua contexto, causas e impacto quando disponível no texto
- Linguagem clara e direta, sem rebuscamento
- Não invente dados que não estejam no texto original
- Não use frases como "com base no texto" — escreva como notícia

Texto da notícia:
${articleText}

Resumo:`;

  // Tenta cada modelo da lista até um funcionar
  for (const model of MODELS) {
    try {
      const summary = await callOpenRouter(key, model, prompt);
      if (summary) {
        return Response.json({ summary, source, model }, { headers: CORS });
      }
    } catch {
      // timeout ou erro de rede — tenta o próximo
    }
  }

  return Response.json(
    { error: 'Todos os modelos indisponíveis no momento. Tente novamente em instantes.' },
    { status: 503, headers: CORS }
  );
}
