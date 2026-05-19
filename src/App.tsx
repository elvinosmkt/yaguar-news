import React from 'react';
import { useNews, NewsFeed } from './sdk';
import './sdk/styles.css';
import './app.css';

const API_KEY = import.meta.env.VITE_GNEWS_API_KEY as string;

export default function App() {
  const news = useNews({
    apiKey: API_KEY,
    scheduleHours: [6, 15],
    maxArticlesPerCategory: 10,
  });

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__brand">
            <span className="app-header__logo">🐆</span>
            <div>
              <div className="app-header__name">Yaguar News</div>
              <div className="app-header__tagline">Notícias às 06h e 15h</div>
            </div>
          </div>
          <div className="app-header__pill">
            <span className="app-header__dot" />
            Ao vivo
          </div>
        </div>
      </header>

      <main className="app-main">
        <NewsFeed news={news} />
      </main>

      <footer className="app-footer">
        <p>Yaguar News © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
