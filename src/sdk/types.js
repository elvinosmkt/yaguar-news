export const NEWS_CATEGORIES = [
    'geral',
    'politica',
    'esportes',
    'economia',
    'tecnologia',
];
export const CATEGORY_LABELS = {
    geral: 'Geral',
    politica: 'Política',
    esportes: 'Esportes',
    economia: 'Economia',
    tecnologia: 'Tecnologia',
};
export const CATEGORY_COLORS = {
    geral: '#64748b',
    politica: '#dc2626',
    esportes: '#16a34a',
    economia: '#2563eb',
    tecnologia: '#7c3aed',
};
export function emptyArticlesMap() {
    return { geral: [], politica: [], esportes: [], economia: [], tecnologia: [] };
}
