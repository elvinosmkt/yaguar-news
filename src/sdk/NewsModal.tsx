import React, { useEffect, useState, useRef } from 'react';
import { NewsArticle, CATEGORY_LABELS, CATEGORY_COLORS } from './types';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function sourceDomain(article: NewsArticle): string {
  try {
    const base = article.source.url || article.url;
    return new URL(base).hostname.replace(/^www\./, '');
  } catch {
    return article.source.name || 'fonte';
  }
}

// Cache em memória — evita chamar a IA duas vezes para o mesmo artigo
const summaryCache = new Map<string, string>();

interface Props {
  article: NewsArticle | null;
  onClose: () => void;
  summarizeUrl?: string; // URL do endpoint de resumo. Default: /api/summarize
}

export function NewsModal({ article, onClose, summarizeUrl = '/api/summarize' }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Fecha com ESC e trava scroll
  useEffect(() => {
    if (!article) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [article, onClose]);

  // Gera resumo ao abrir o modal
  useEffect(() => {
    if (!article) { setSummary(null); return; }

    // Já tem no cache — usa direto
    if (summaryCache.has(article.id)) {
      setSummary(summaryCache.get(article.id)!);
      return;
    }

    // Aborta chamada anterior se usuário trocar de artigo rapidamente
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setSummary(null);
    setSummaryError(false);
    setLoadingSummary(true);

    fetch(summarizeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        title:       article.title,
        description: article.description,
        content:     article.content,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.summary) {
          summaryCache.set(article.id, data.summary);
          setSummary(data.summary);
        } else {
          setSummaryError(true);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') setSummaryError(true);
      })
      .finally(() => setLoadingSummary(false));

    return () => ctrl.abort();
  }, [article?.id]);

  if (!article) return null;

  const color    = CATEGORY_COLORS[article.category];
  const domain   = sourceDomain(article);
  const fallback = [article.description, article.content].filter(Boolean).join('\n\n');

  return (
    <div
      className="yn-overlay"
      onClick={(e) => e.currentTarget === e.target && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="yn-modal-title"
    >
      <div className="yn-modal">
        <div className="yn-modal__handle" aria-hidden />
        <button className="yn-modal__close" onClick={onClose} aria-label="Fechar">✕</button>

        <div className="yn-modal__body">
          <span className="yn-modal__badge" style={{ background: color }}>
            {CATEGORY_LABELS[article.category]}
          </span>

          {article.image && (
            <img src={article.image} alt="" className="yn-modal__img" />
          )}

          <h2 id="yn-modal-title" className="yn-modal__title">{article.title}</h2>

          <div className="yn-modal__meta">
            <span className="yn-modal__source">{article.source.name || domain}</span>
            <span className="yn-modal__date">{fmt(article.publishedAt)}</span>
          </div>

          {/* Resumo IA */}
          <div className="yn-modal__excerpt-box">
            {loadingSummary && (
              <div className="yn-modal__summary-loading">
                <span className="yn-modal__summary-spinner" aria-hidden>⟳</span>
                <span>Gerando resumo...</span>
              </div>
            )}

            {!loadingSummary && summary && (
              <>
                <span className="yn-modal__excerpt-label yn-modal__excerpt-label--ai">
                  ✦ Resumo gerado por IA
                </span>
                <div className="yn-modal__lead yn-modal__lead--ai">
                  {summary.split('\n').filter(Boolean).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </>
            )}

            {!loadingSummary && !summary && (fallback || summaryError) && (
              <>
                <span className="yn-modal__excerpt-label">Trecho do artigo</span>
                <p className="yn-modal__lead">{fallback}</p>
                {summaryError && (
                  <p className="yn-modal__summary-err">Resumo indisponível no momento.</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="yn-modal__actions">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="yn-modal__cta"
            style={{ background: color }}
          >
            Ler matéria completa em {domain} →
          </a>
        </div>
      </div>
    </div>
  );
}
