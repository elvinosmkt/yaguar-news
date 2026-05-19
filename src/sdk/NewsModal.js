import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { CATEGORY_LABELS, CATEGORY_COLORS } from './types';
function fmt(iso) {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}
export function NewsModal({ article, onClose }) {
    useEffect(() => {
        if (!article)
            return;
        const h = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', h);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
    }, [article, onClose]);
    if (!article)
        return null;
    const color = CATEGORY_COLORS[article.category];
    return (_jsx("div", { className: "yn-overlay", onClick: (e) => e.currentTarget === e.target && onClose(), role: "dialog", "aria-modal": "true", "aria-labelledby": "yn-modal-title", children: _jsxs("div", { className: "yn-modal", children: [_jsx("button", { className: "yn-modal__close", onClick: onClose, "aria-label": "Fechar", children: "\u2715" }), _jsx("span", { className: "yn-modal__badge", style: { background: color }, children: CATEGORY_LABELS[article.category] }), article.image && _jsx("img", { src: article.image, alt: "", className: "yn-modal__img" }), _jsx("h2", { id: "yn-modal-title", className: "yn-modal__title", children: article.title }), _jsxs("div", { className: "yn-modal__meta", children: [_jsx("span", { className: "yn-modal__source", children: article.source.name }), _jsx("span", { className: "yn-modal__date", children: fmt(article.publishedAt) })] }), _jsx("p", { className: "yn-modal__content", children: article.content }), _jsx("a", { href: article.url, target: "_blank", rel: "noopener noreferrer", className: "yn-modal__cta", style: { background: color }, children: "Ler mat\u00E9ria completa \u2192" })] }) }));
}
