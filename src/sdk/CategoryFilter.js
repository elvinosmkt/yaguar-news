import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NEWS_CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS } from './types';
export function CategoryFilter({ selected, onChange, categories = NEWS_CATEGORIES, counts }) {
    return (_jsx("nav", { className: "yn-filter", children: categories.map((cat) => {
            const active = selected === cat;
            const color = CATEGORY_COLORS[cat];
            return (_jsxs("button", { className: `yn-filter__btn${active ? ' yn-filter__btn--active' : ''}`, style: active ? { background: color, borderColor: color, color: '#fff' } : { borderColor: color, color }, onClick: () => onChange(cat), "aria-pressed": active, children: [CATEGORY_LABELS[cat], counts?.[cat] !== undefined && (_jsx("span", { className: "yn-filter__count", children: counts[cat] }))] }, cat));
        }) }));
}
