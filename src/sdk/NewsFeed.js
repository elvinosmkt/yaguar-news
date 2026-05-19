import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NEWS_CATEGORIES } from './types';
import { NewsCard } from './NewsCard';
import { NewsModal } from './NewsModal';
import { CategoryFilter } from './CategoryFilter';
import { formatLastUpdated } from './scheduler';
function Skeleton() {
    return (_jsxs("div", { className: "yn-card yn-card--skeleton", "aria-hidden": true, children: [_jsx("div", { className: "yn-sk yn-sk--img" }), _jsxs("div", { className: "yn-card__body", children: [_jsx("div", { className: "yn-sk yn-sk--title" }), _jsx("div", { className: "yn-sk yn-sk--text" }), _jsx("div", { className: "yn-sk yn-sk--text yn-sk--short" })] })] }));
}
export function NewsFeed({ news, title = 'Notícias' }) {
    const { articles, loading, error, lastUpdated, refresh, selectedCategory, setCategory, selectedArticle, selectArticle } = news;
    const counts = NEWS_CATEGORIES.reduce((acc, cat) => {
        acc[cat] = articles[cat]?.length ?? 0;
        return acc;
    }, {});
    const current = articles[selectedCategory] ?? [];
    return (_jsxs("section", { className: "yn-feed", children: [_jsxs("header", { className: "yn-feed__header", children: [_jsxs("div", { children: [_jsx("h2", { className: "yn-feed__title", children: title }), lastUpdated && (_jsxs("span", { className: "yn-feed__updated", children: ["Atualizado: ", formatLastUpdated(lastUpdated)] }))] }), _jsxs("button", { className: "yn-feed__refresh", onClick: refresh, disabled: loading, children: [loading ? '⟳' : '↻', " Atualizar"] })] }), _jsx(CategoryFilter, { selected: selectedCategory, onChange: setCategory, counts: counts }), error && (_jsxs("div", { className: "yn-error", role: "alert", children: [_jsxs("span", { children: ["\u26A0 ", error] }), _jsx("button", { onClick: refresh, className: "yn-error__retry", children: "Tentar novamente" })] })), _jsxs("div", { className: "yn-grid", children: [loading && current.length === 0
                        ? Array.from({ length: 6 }).map((_, i) => _jsx(Skeleton, {}, i))
                        : current.map((a) => _jsx(NewsCard, { article: a, onClick: selectArticle }, a.id)), !loading && current.length === 0 && !error && (_jsxs("div", { className: "yn-empty", children: [_jsx("p", { children: "Nenhuma not\u00EDcia encontrada." }), _jsx("button", { onClick: refresh, className: "yn-empty__btn", children: "Carregar not\u00EDcias" })] }))] }), _jsx(NewsModal, { article: selectedArticle, onClose: () => selectArticle(null) })] }));
}
