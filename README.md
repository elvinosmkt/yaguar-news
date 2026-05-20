# Yaguar News SDK

Feed de notícias brasileiras para React — com categorias, filtros e atualização automática às 06h e 15h.

## Instalação

```bash
npm install yaguar-news
```

## Como usar (2 partes)

O SDK tem **duas partes separadas**:

| Parte | O que é | Onde fica |
|-------|---------|-----------|
| **SDK** (front-end) | Os componentes React que você instala | No seu projeto |
| **Backend** (API) | O servidor que busca as notícias | Você precisa fazer o deploy |

---

## 1. Backend — Deploy da API

A pasta `api/` contém o servidor que busca as notícias nas fontes externas.
Você precisa fazer o deploy dela no **Vercel** (é gratuito).

### Variáveis de ambiente necessárias no Vercel:

| Variável | Descrição | Onde obter |
|----------|-----------|-----------|
| `GNEWS_KEY` | Chave da GNews API (principal) | https://gnews.io |
| `WORLDNEWS_API_KEY` | Chave da WorldNewsAPI (fallback) | https://worldnewsapi.com |
| `NEWSAPI_KEY` | Chave da NewsAPI (fallback) | https://newsapi.org |

Basta ter **uma** das três — o SDK tenta na ordem acima.

---

## 2. SDK — Usando no seu projeto React

### Importação básica

```tsx
import { NewsFeed, useNews } from 'yaguar-news'
import 'yaguar-news/styles'

export default function App() {
  const news = useNews({
    proxyUrl: 'https://SEU-PROJETO.vercel.app/api/news', // URL do backend que você fez o deploy
    scheduleHours: [6, 15],       // Atualiza automaticamente às 06h e 15h
    maxArticlesPerCategory: 10,   // Máximo de artigos por categoria
  })

  return <NewsFeed news={news} title="Últimas Notícias" />
}
```

### Usando componentes individuais

```tsx
import { useNews, NewsCard, CategoryFilter } from 'yaguar-news'
import 'yaguar-news/styles'

export default function MinhasPagina() {
  const news = useNews({ proxyUrl: 'https://SEU-PROJETO.vercel.app/api/news' })

  return (
    <div>
      <CategoryFilter
        selected={news.selectedCategory}
        onChange={news.setCategory}
        counts={{}}
      />
      {news.articles[news.selectedCategory].map(article => (
        <NewsCard key={article.id} article={article} onClick={news.selectArticle} />
      ))}
    </div>
  )
}
```

---

## Componentes disponíveis

| Componente | Descrição |
|-----------|-----------|
| `<NewsFeed />` | Feed completo com filtros, grid e modal |
| `<NewsCard />` | Card individual de notícia |
| `<CategoryFilter />` | Barra de filtro por categoria |
| `<NewsModal />` | Modal de detalhe do artigo |

## Hook disponível

| Hook | Descrição |
|------|-----------|
| `useNews(config)` | Busca notícias, gerencia cache e agendamento |

### Opções do `useNews`

```ts
useNews({
  proxyUrl?: string          // URL da sua API (obrigatório em produção)
  scheduleHours?: number[]   // Horários de atualização. Ex: [6, 15]
  maxArticlesPerCategory?: number  // Padrão: 10
  categories?: NewsCategory[]      // Padrão: todas as 5 categorias
})
```

## Categorias

`geral` | `politica` | `esportes` | `economia` | `tecnologia`

---

## Estrutura do projeto

```
yaguar-news/
├── src/
│   ├── sdk/          ← Código da biblioteca (componentes + hook)
│   └── App.tsx       ← Demo local para testar
├── api/
│   └── news.ts       ← Backend (Vercel Edge Function)
├── dist/             ← SDK compilado (gerado por npm run build:sdk)
└── vite.lib.config.ts ← Configuração do build da biblioteca
```

## Comandos

```bash
npm run dev          # Inicia o demo local (http://localhost:5173)
npm run build:sdk    # Compila o SDK para a pasta dist/
npm run build:demo   # Compila o demo para deploy (site estático)
```
