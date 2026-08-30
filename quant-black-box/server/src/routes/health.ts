import { Router } from 'express';

const MODELS = [
  { id: 'bs', name: 'Black-Scholes-Merton Option Pricing', method: 'Closed-form (BSM)', endpoint: '/api/bs' },
  { id: 'heston', name: 'Heston Stochastic Volatility', method: 'Characteristic function + Simpson quadrature', endpoint: '/api/heston' },
  { id: 'bl', name: 'Black-Litterman Model', method: 'Matrix Bayesian update', endpoint: '/api/bl' },
  { id: 'mc', name: 'Monte Carlo Portfolio Simulation', method: 'Seeded GBM (Mulberry32), 60 steps', endpoint: '/api/mc' },
  { id: 'apt', name: 'Arbitrage Pricing Theory', method: 'Linear multi-factor model', endpoint: '/api/apt' },
];

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'quant-black-box-api', models: MODELS.map((m) => m.id), features: ['workspace', 'market-data'] });
});

router.get('/models', (_req, res) => {
  res.json(MODELS);
});

export default router;
