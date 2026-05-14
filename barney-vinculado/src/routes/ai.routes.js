import { Router } from 'express';
import { z } from 'zod';
import { requireActiveSubscription, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.post('/chat', requireAuth, requireActiveSubscription, asyncHandler(async (req, res) => {
  const schema = z.object({ message: z.string().min(1).max(2000) });
  const { message } = schema.parse(req.body);
  const text = message.toLowerCase();

  let answer = 'Analisei sua pergunta. Para uma resposta avançada com IA real, conecte uma chave OPENAI_API_KEY no backend. Enquanto isso, organize receitas, despesas, categorias e metas para receber recomendações mais precisas.';

  if (text.includes('econom')) {
    answer = 'Sugestão inicial: corte 10% das categorias não essenciais, acompanhe despesas por semana e crie uma meta de reserva equivalente a 3 a 6 meses dos seus custos fixos.';
  }
  if (text.includes('invest')) {
    answer = 'Para começar com mais segurança, priorize reserva de emergência antes de ativos voláteis. Depois, avalie perfil de risco, prazo e liquidez.';
  }
  if (text.includes('gasto') || text.includes('categoria')) {
    answer = 'O ideal é comparar suas maiores categorias nos últimos 30 dias. Use a rota de transações para salvar gastos e gerar um diagnóstico real por categoria.';
  }

  res.json({ answer, provider: 'local-safe-assistant' });
}));

router.post('/image-mockup', requireAuth, requireActiveSubscription, asyncHandler(async (req, res) => {
  const schema = z.object({ prompt: z.string().min(3).max(500), style: z.string().max(80).optional() });
  const data = schema.parse(req.body);
  res.json({
    status: 'mockup_ready',
    prompt: data.prompt,
    style: data.style || 'Fintech premium',
    note: 'Conecte uma API de geração de imagens para renderização real no servidor.'
  });
}));

export default router;
