import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNews, NewsFeed } from './sdk';
import './sdk/styles.css';
import './app.css';
const API_KEY = import.meta.env.VITE_GNEWS_API_KEY;
export default function App() {
    const news = useNews({
        apiKey: API_KEY,
        scheduleHours: [6, 15],
        maxArticlesPerCategory: 10,
    });
    return (_jsxs("div", { className: "app", children: [_jsx("header", { className: "app-header", children: _jsxs("div", { className: "app-header__inner", children: [_jsxs("div", { className: "app-header__brand", children: [_jsx("span", { className: "app-header__logo", children: "\uD83D\uDC06" }), _jsxs("div", { children: [_jsx("div", { className: "app-header__name", children: "Yaguar News" }), _jsx("div", { className: "app-header__tagline", children: "Atualizado \u00E0s 06h e 15h \u00B7 Pol\u00EDtica \u00B7 Esportes \u00B7 Economia \u00B7 Tecnologia" })] })] }), _jsxs("div", { className: "app-header__pill", children: [_jsx("span", { className: "app-header__dot" }), "Ao vivo"] })] }) }), _jsx("main", { className: "app-main", children: _jsx(NewsFeed, { news: news, title: "" }) }), _jsx("footer", { className: "app-footer", children: _jsxs("p", { children: ["Powered by ", _jsx("strong", { children: "GNews" }), " \u00B7 Yaguar News \u00A9 ", new Date().getFullYear()] }) })] }));
}
