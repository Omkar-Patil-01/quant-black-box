# Black Box — 3D Quantitative Finance Models

An interactive, dark-themed 3D explorer for five classic quantitative finance models, built as a single-page React application. Each model renders an explorable 3D surface (drag to rotate, scroll to zoom) alongside parameter sliders, live statistics, and rendered mathematical formulas.

## Models

| Model | Surface | Key metrics |
| --- | --- | --- |
| **Black–Scholes–Merton** | Option price over strike vs. time | Call/Put, Delta, Gamma, Vega, Theta, Rho |
| **Heston Stochastic Volatility** | Option price over strike vs. variance | Call/Put, Delta, risk-neutral probabilities (CF integration) |
| **Black–Litterman** | Expected return over market cap weight vs. tau | Implied equilibrium, posterior returns, optimal weights |
| **Monte Carlo Path Simulation** | Simulated paths (price/return) | Mean, median, 5% VaR, P(loss), 95% CI, CRRA utility |
| **Arbitrage Pricing Theory** | Expected return plane over market & size betas | Fair/alpha-adjusted return, factor premia |

## Features

- Interactive 3D surfaces via **ECharts + echarts-gl** (real-time re-render on slider changes)
- Four colour schemes (P&L, Mono, Neon, Surface) with wireframe/grid/axes toggles and auto-rotate
- Live metric panels and colour-scaled value bars for each model
- KaTeX-rendered formula reference for every model
- Seeded Monte Carlo engine for reproducible simulations
- Animated Three.js starfield landing page

## Tech Stack

React 19 · TypeScript 5.8 · Vite 6 · Tailwind CSS 4 · Zustand 5 · Recharts 3 · ECharts 5 + echarts-gl · Three.js 184 (R3F + Drei) · KaTeX 0.17 + react-katex · Motion 12 · Lucide · Vitest 4

## Getting Started

```bash
npm install
npm run dev        # start the dev server
npm run typecheck  # TypeScript checks
npm test           # run the Vitest suite
npm run build      # typecheck + production build
```

## Project Structure

```
quant-black-box/
├─ src/
│  ├─ lib/           # math engines (BSM, Heston CF, Black–Litterman, Monte Carlo, APT), formats, formulas
│  ├─ store/         # Zustand stores (navigation + per-model state)
│  ├─ components/    # 3D surface chart, layout, UI primitives, formulas modal, starfield background
│  ├─ pages/         # one page per model + landing page
│  ├─ App.tsx        # view switching
│  └─ main.tsx       # entry point
└─ vite.config.ts
```
