export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

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

  let title = '', description = '', content = '';
  try {
    const body = await request.json();
    title       = body.title       ?? '';
    description = body.description ?? '';
    content     = body.content     ?? '';
  } catch {
    return Response.json({ error: 'Body JSON inválido' }, { status: 400, headers: CORS });
  }

  // Monta o texto disponível para a IA resumir
  const parts: string[] = [];
  if (title)       parts.push(`Título: ${title}`);
  if (description) parts.push(`Descrição: ${description}`);
  if (content)     parts.push(`Conteúdo: ${content}`);
  const text = parts.join('\n\n');

  const prompt = `Você é um jornalista brasileiro experiente. Com base nas informações abaixo, escreva um resumo completo e bem estruturado da notícia em português.

Regras:
- Escreva entre 3 e 5 parágrafos curtos
- Comece com o fato principal (quem, o quê, quando, onde)
- Inclua contexto e impacto quando disponível
- Linguagem clara, direta, sem rebuscamento
- Não invente dados que não estejam no texto original
- Não mencione "com base no texto" ou frases similares — escreva como uma notícia

Informações disponíveis:
${text}

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
        max_tokens: 700,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `OpenRouter erro ${res.status}: ${err}` }, { status: 502, headers: CORS });
    }

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content?.trim() ?? '';

    return Response.json({ summary }, { headers: CORS });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500, headers: CORS });
  }
}
