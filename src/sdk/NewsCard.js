import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CATEGORY_LABELS, CATEGORY_COLORS } from './types';
function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (m < 60)
        return `${m}min atrás`;
    if (h < 24)
        return `${h}h atrás`;
    return `${d}d atrás`;
}
export function NewsCard({ article, onClick }) {
    const color = CATEGORY_COLORS[article.category];
    return (_jsxs("article", { className: "yn-card", onClick: () => onClick(article), role: "button", tabIndex: 0, onKeyDown: (e) => e.key === 'Enter' && onClick(article), children: [_jsxs("div", { className: "yn-card__img-wrap", children: [article.image
                        ? _jsx("img", { src: article.image, alt: "", className: "yn-card__img", loading: "lazy" })
                        : _jsx("div", { className: "yn-card__img-ph", children: "\uD83D\uDCF0" }), _jsx("span", { className: "yn-card__badge", style: { background: color }, children: CATEGORY_LABELS[article.category] })] }), _jsxs("div", { className: "yn-card__body", children: [_jsx("h3", { className: "yn-card__title", children: article.title }), _jsx("p", { className: "yn-card__desc", children: article.description }), _jsxs("footer", { className: "yn-card__footer", children: [_jsx("span", { className: "yn-card__source", children: article.source.name }), _jsx("span", { className: "yn-card__time", children: timeAgo(article.publishedAt) })] })] })] }));
}
