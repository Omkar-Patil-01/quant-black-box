# Black Box — Quantitative Finance Models

An interactive, dark-themed explorer for six quantitative finance models, built as a single-page React application. Each model gives you parameter sliders, live statistics and KaTeX-rendered formulas. Five render explorable 3D surfaces (drag to rotate, scroll to zoom); Monte Carlo defaults to a 2D multi-path chart with its surface behind a `2D PATHS / 3D SURFACE` toggle.

## Models

| Model | View | Key metrics |
| --- | --- | --- |
| **Black–Scholes–Merton** | Option price over strike vs. time | Call/Put, Delta, Gamma, Vega, Theta, Rho |
| **Heston Stochastic Volatility** | Option price over strike vs. variance | Call/Put, Delta, risk-neutral probabilities (characteristic-function integration) |
| **Black–Litterman** | Expected return over market cap weight vs. tau | Implied equilibrium, posterior returns, optimal weights |
| **Monte Carlo Path Simulation** | 2D simulated paths + terminal distribution histogram | Mean, median, 5% VaR, P(loss), 95% CI, CRRA utility, skewness, kurtosis, drawdown-at-Risk, max drawdown |
| **Arbitrage Pricing Theory** | Expected return plane over market & size betas | Fair/alpha-adjusted return, factor premia |
| **Kalman Filter** | Recursive state estimation over time | Filtered state, state covariance, innovation, Kalman gain, trace(P) |

## Features

- Explorable 3D surfaces via **ECharts + echarts-gl**, re-rendering live on every slider change
- Monte Carlo path chart: faint bulk paths, a p5–p95 band, highlighted runs, terminal histogram column, scroll-zoom and drag-pan
- Four colour schemes (P&L, Mono, Neon, Surface) with wireframe/grid/axes toggles and auto-rotate
- Live metric panels and colour-scaled value bars for each model
- KaTeX-rendered formula reference for every model
- Seeded Monte Carlo engine, so a run is reproducible and the browser and the API return identical numbers
- Workspace persistence — saved scenarios, presets, recent runs and favourites
- Live market-data ingestion (quotes, candles, options chains, catalogues)
- Animated Three.js starfield landing page

## Backend

`src/lib/math.ts` is the single source of truth for every quant engine. The browser uses it directly, and the Express API in `server/` re-exports the same module — so the numbers on screen and the numbers over the wire cannot drift apart.

The API is deployed as a single Vercel Function (`api/index.ts` re-exports the Express app; `vercel.json` routes `/api/*` to it) and persists state to Postgres through Neon.

| Group | Methods | Notes |
| --- | --- | --- |
| `/api/bs`, `/api/heston`, `/api/bl`, `/api/mc`, `/api/apt`, `/api/kf` | `POST` | Public, zod-validated |
| `/api/workspace` | `GET`, `PUT`, `DELETE` + `/scenarios`, `/presets`, `/runs`, `/favorites` | Postgres-backed |
| `/api/market` | `GET` | Proxies the London Strategic Edge API |
| `/api/health`, `/api/models` | `GET` | Service and model catalogue |

## Tech Stack

**Frontend:** React 19 · TypeScript 5.8 · Vite 6 · Tailwind CSS 4 · Zustand 5 · ECharts 5 + echarts-gl · Recharts 3 · Three.js 184 (R3F + Drei) · KaTeX 0.17 + react-katex · Motion 12 · Lucide · Vitest 4

**API:** Express 4 · Zod 3 · `@neondatabase/serverless`

## Getting Started

```bash
npm install
cp .env.example .env      # then fill in the keys you have
npm run dev               # frontend on :5173
npm run dev:server        # API on :8080 (the frontend proxies /api to it)
```

Both backend keys are optional. Without `LSE_API_KEY`, `/api/market/*` answers 503; without `DATABASE_URL`, `/api/workspace` is unavailable. Every model page computes in the browser, so all six keep working either way.

### Scripts

| | |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run dev:server` | API via tsx watch |
| `npm run build` | Typecheck + production build |
| `npm run build:server` | Compile the API to `server/dist` |
| `npm run start:server` | Run the compiled API |
| `npm run typecheck` / `typecheck:server` | TypeScript checks for each half |
| `npm test` | Vitest suite |

## Project Structure

```
quant-black-box/
├─ api/
│  └─ index.ts         # Vercel Function — re-exports the Express app
├─ server/
│  └─ src/
│     ├─ app.ts        # Express app, routes, lazy schema init
│     ├─ index.ts      # local entry point (npm run dev:server)
│     ├─ db.ts         # Neon serverless Postgres client
│     ├─ schema.ts     # DDL
│     ├─ market.ts     # London Strategic Edge proxy
│     ├─ routes/       # bs, heston, bl, mc, apt, kf, workspace, market, health
│     └─ middleware/
├─ src/
│  ├─ lib/             # math engines, formats, formulas, API clients
│  ├─ store/           # Zustand stores (navigation + per-model state)
│  ├─ components/      # charts, layout, UI primitives, formulas modal, starfield
│  ├─ pages/           # one page per model + landing page
│  ├─ App.tsx          # view switching
│  └─ main.tsx         # entry point
├─ vite.config.ts
└─ vercel.json         # /api/* -> the function, everything else -> the SPA
```

## Deployment

Vercel hosts both the SPA and the API from this repo. The functions need `LSE_API_KEY` and `DATABASE_URL` set for **Production**.

Editing an environment variable does not affect an already-deployed build — Vercel snapshots env at build time, and inlined `VITE_*` values are baked into the bundle. **Redeploy after changing any env var**, or the running function and the shipped JavaScript will silently keep the old value.
