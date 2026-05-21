const MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'deepseek/deepseek-v4-flash:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
];

async function fetchFullText(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/plain', 'X-Return-Format': 'text' },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 4000).trim() || null;
  } catch {
    return null;
  }
}

async function callOpenRouter(key: string, model: string, prompt: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
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
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

module.exports = async (req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENROUTER_API_KEY não configurada' });

  const { title = '', description = '', content = '', url = '' } = req.body ?? {};

  const fullText = url ? await fetchFullText(url) : null;
  const hasFullText = !!(fullText && fullText.length > 300);

  const articleText = hasFullText
    ? fullText!
    : [title && `Título: ${title}`, description && `Descrição: ${description}`, content && `Conteúdo: ${content}`]
        .filter(Boolean).join('\n\n');

  const prompt = `Você é um jornalista brasileiro experiente. Com base no texto abaixo, escreva um resumo completo da notícia em português.

Regras:
- Escreva entre 3 e 5 parágrafos curtos e objetivos
- Comece com o fato principal (quem, o quê, quando, onde)
- Inclua contexto, causas e impacto quando disponível
- Linguagem clara e direta
- Não invente informações além do texto original
- Não use "com base no texto" — escreva como notícia

Texto:
${articleText}

Resumo:`;

  for (const model of MODELS) {
    const summary = await callOpenRouter(key, model, prompt);
    if (summary) {
      return res.status(200).json({ summary, source: hasFullText ? 'full' : 'partial', model });
    }
  }

  return res.status(503).json({ error: 'Serviço temporariamente indisponível. Tente novamente.' });
};
