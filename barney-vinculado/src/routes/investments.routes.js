import { Router } from 'express';
import { requireActiveSubscription, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

const investments = [
  { name: 'Tesouro Selic', profile: 'Conservador', score: 9.6, risk: 'Baixo', stability: 'Muito alta', potential: 42, desc: 'Ideal para reserva e liquidez.' },
  { name: 'CDB 100% CDI', profile: 'Conservador', score: 9.1, risk: 'Baixo', stability: 'Alta', potential: 48, desc: 'Boa previsibilidade com proteção do FGC.' },
  { name: 'ETF Global', profile: 'Moderado', score: 8.9, risk: 'Moderado', stability: 'Alta', potential: 76, desc: 'Diversificação internacional e longo prazo.' },
  { name: 'Fundos Imobiliários', profile: 'Moderado', score: 8.4, risk: 'Moderado', stability: 'Média/Alta', potential: 68, desc: 'Renda passiva com oscilação de mercado.' },
  { name: 'Ações Blue Chips', profile: 'Moderado', score: 8.2, risk: 'Moderado', stability: 'Média', potential: 72, desc: 'Empresas sólidas com potencial patrimonial.' },
  { name: 'Ações Growth', profile: 'Agressivo', score: 7.9, risk: 'Elevado', stability: 'Volátil', potential: 92, desc: 'Crescimento alto com maior oscilação.' },
  { name: 'Criptoativos', profile: 'Agressivo', score: 7.4, risk: 'Muito alto', stability: 'Baixa', potential: 100, desc: 'Alta volatilidade e alto risco.' },
  { name: 'Small Caps', profile: 'Agressivo', score: 7.7, risk: 'Elevado', stability: 'Volátil', potential: 88, desc: 'Potencial grande, exige análise profunda.' }
];

router.get('/', requireAuth, requireActiveSubscription, asyncHandler(async (req, res) => {
  const profile = req.query.profile;
  const items = profile && profile !== 'Todos'
    ? investments.filter((item) => item.profile === profile)
    : investments;
  res.json({ investments: items });
}));

router.post('/simulate', requireAuth, requireActiveSubscription, asyncHandler(async (req, res) => {
  const initial = Number(req.body.initial || 0);
  const monthly = Number(req.body.monthly || 0);
  const years = Number(req.body.years || 0);
  const rate = Number(req.body.rate || 0) / 100;

  let total = initial;
  const points = [];

  for (let i = 1; i <= years * 12; i += 1) {
    total = total * (1 + rate) + monthly;
    if (i % 12 === 0) points.push({ year: i / 12, total: Number(total.toFixed(2)) });
  }

  const invested = initial + monthly * years * 12;
  res.json({
    total: Number(total.toFixed(2)),
    invested: Number(invested.toFixed(2)),
    profit: Number((total - invested).toFixed(2)),
    points
  });
}));

export default router;
