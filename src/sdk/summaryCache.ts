import { NewsArticle } from './types';

const PREFIX = 'yn_sum_v1_';

export function getSummary(articleId: string): string | null {
  try { return localStorage.getItem(PREFIX + articleId); } catch { return null; }
}

export function saveSummary(articleId: string, summary: string): void {
  try { localStorage.setItem(PREFIX + articleId, summary); } catch { /* ignore */ }
}

async function generateOne(article: NewsArticle, summarizeUrl: string): Promise<void> {
  if (getSummary(article.id)) return; // já tem — pula
  try {
    const res = await fetch(summarizeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
      }),
    });
    const data = await res.json();
    if (data.summary) saveSummary(article.id, data.summary);
  } catch { /* falha silenciosa — será gerado on-demand */ }
}

// Gera resumos em background para todos os artigos novos, 2 por vez
// para não sobrecarregar o rate limit dos modelos gratuitos
export async function prefetchSummaries(
  articles: NewsArticle[],
  summarizeUrl: string
): Promise<void> {
  const pending = articles.filter(a => !getSummary(a.id));
  if (!pending.length) return;

  const BATCH = 2;
  const DELAY = 2500; // ms entre batches

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    await Promise.all(batch.map(a => generateOne(a, summarizeUrl)));
    if (i + BATCH < pending.length) {
      await new Promise(r => setTimeout(r, DELAY));
    }
  }
}
