import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireActiveSubscription, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import { publicTransaction } from '../utils/serializers.js';
import { toCents } from '../utils/money.js';

const router = Router();

const transactionSchema = z.object({
  type: z.enum(['Receita', 'Despesa']),
  category: z.string().min(2).max(80),
  description: z.string().max(180).optional(),
  amount: z.coerce.number().positive(),
  date: z.coerce.date().optional()
});

router.get('/', requireAuth, requireActiveSubscription, asyncHandler(async (req, res) => {
  const schema = z.object({
    type: z.enum(['Receita', 'Despesa']).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    limit: z.coerce.number().int().positive().max(200).default(100)
  });
  const query = schema.parse(req.query);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.user.id,
      type: query.type,
      date: {
        gte: query.startDate,
        lte: query.endDate
      }
    },
    orderBy: { date: 'desc' },
    take: query.limit
  });

  const receitas = transactions.filter((t) => t.type === 'Receita').reduce((sum, t) => sum + t.amountCents, 0);
  const despesas = transactions.filter((t) => t.type === 'Despesa').reduce((sum, t) => sum + t.amountCents, 0);

  res.json({
    transactions: transactions.map(publicTransaction),
    summary: {
      receitas: receitas / 100,
      despesas: despesas / 100,
      saldo: (receitas - despesas) / 100,
      count: transactions.length
    }
  });
}));

router.post('/', requireAuth, requireActiveSubscription, asyncHandler(async (req, res) => {
  const data = transactionSchema.parse(req.body);
  const transaction = await prisma.transaction.create({
    data: {
      userId: req.user.id,
      type: data.type,
      category: data.category,
      description: data.description,
      amountCents: toCents(data.amount),
      date: data.date || new Date()
    }
  });
  res.status(201).json({ transaction: publicTransaction(transaction) });
}));

router.patch('/:id', requireAuth, requireActiveSubscription, asyncHandler(async (req, res) => {
  const data = transactionSchema.partial().parse(req.body);
  const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) throw new HttpError(404, 'Lançamento não encontrado');

  const transaction = await prisma.transaction.update({
    where: { id: req.params.id },
    data: {
      type: data.type,
      category: data.category,
      description: data.description,
      amountCents: data.amount === undefined ? undefined : toCents(data.amount),
      date: data.date
    }
  });

  res.json({ transaction: publicTransaction(transaction) });
}));

router.delete('/:id', requireAuth, requireActiveSubscription, asyncHandler(async (req, res) => {
  const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!existing) throw new HttpError(404, 'Lançamento não encontrado');
  await prisma.transaction.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

export default router;
