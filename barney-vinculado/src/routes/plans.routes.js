import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { publicPlan } from '../utils/serializers.js';
import { toCents } from '../utils/money.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { priceCents: 'asc' }
  });
  res.json({ plans: plans.map(publicPlan) });
}));

router.post('/', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const schema = z.object({
    code: z.string().min(2).max(40).transform((v) => v.toLowerCase()),
    name: z.string().min(2).max(80),
    price: z.coerce.number().positive(),
    durationMonths: z.coerce.number().int().positive()
  });
  const data = schema.parse(req.body);
  const plan = await prisma.plan.create({
    data: {
      code: data.code,
      name: data.name,
      priceCents: toCents(data.price),
      durationMonths: data.durationMonths
    }
  });
  res.status(201).json({ plan: publicPlan(plan) });
}));

router.patch('/:id', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(80).optional(),
    price: z.coerce.number().positive().optional(),
    durationMonths: z.coerce.number().int().positive().optional(),
    isActive: z.boolean().optional()
  });
  const data = schema.parse(req.body);
  const plan = await prisma.plan.update({
    where: { id: req.params.id },
    data: {
      name: data.name,
      durationMonths: data.durationMonths,
      isActive: data.isActive,
      priceCents: data.price === undefined ? undefined : toCents(data.price)
    }
  });
  res.json({ plan: publicPlan(plan) });
}));

export default router;
