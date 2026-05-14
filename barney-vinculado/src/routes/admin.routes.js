import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { encryptText, hashPassword } from '../utils/crypto.js';
import { HttpError } from '../utils/http-error.js';
import { publicPayment, publicSubscription, publicUser } from '../utils/serializers.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/dashboard', asyncHandler(async (req, res) => {
  const [users, activeSubscriptions, paymentsPaid, paymentsPending] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', endsAt: { gt: new Date() } } }),
    prisma.payment.findMany({ where: { status: 'PAID' } }),
    prisma.payment.count({ where: { status: 'PENDING' } })
  ]);

  const revenue = paymentsPaid.reduce((sum, item) => sum + item.amountCents, 0) / 100;
  res.json({ users, activeSubscriptions, pendingPayments: paymentsPending, revenue });
}));

router.get('/students', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      subscriptions: { include: { plan: true }, orderBy: { endsAt: 'desc' }, take: 1 }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  res.json({
    students: users.map((user) => ({
      ...publicUser(user),
      subscription: publicSubscription(user.subscriptions[0])
    }))
  });
}));

router.post('/students', asyncHandler(async (req, res) => {
  const schema = z.object({
    name: z.string().min(3).max(120),
    email: z.string().email().max(180).transform((v) => v.toLowerCase()),
    password: z.string().min(8).max(100).default('barney1234'),
    phone: z.string().max(20).optional(),
    cpf: z.string().max(20).optional(),
    planCode: z.string().min(2).max(40).optional()
  });

  const data = schema.parse(req.body);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: 'STUDENT',
      phoneCipher: data.phone ? encryptText(data.phone.replace(/\D/g, '')) : null,
      cpfCipher: data.cpf ? encryptText(data.cpf.replace(/\D/g, '')) : null
    }
  });

  let subscription = null;
  if (data.planCode) {
    const plan = await prisma.plan.findUnique({ where: { code: data.planCode.toLowerCase() } });
    if (!plan) throw new HttpError(404, 'Plano não encontrado');
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + plan.durationMonths);
    subscription = await prisma.subscription.create({
      data: { userId: user.id, planId: plan.id, status: 'ACTIVE', endsAt },
      include: { plan: true }
    });
  }

  res.status(201).json({ user: publicUser(user), subscription: publicSubscription(subscription) });
}));

router.patch('/students/:id/status', asyncHandler(async (req, res) => {
  const schema = z.object({ isActive: z.boolean() });
  const { isActive } = schema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive } });
  res.json({ user: publicUser(user) });
}));

router.post('/students/:id/subscriptions', asyncHandler(async (req, res) => {
  const schema = z.object({ planCode: z.string().min(2).max(40) });
  const { planCode } = schema.parse(req.body);

  const plan = await prisma.plan.findUnique({ where: { code: planCode.toLowerCase() } });
  if (!plan) throw new HttpError(404, 'Plano não encontrado');

  const endsAt = new Date();
  endsAt.setMonth(endsAt.getMonth() + plan.durationMonths);

  const subscription = await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { userId: req.params.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED' }
    });
    return tx.subscription.create({
      data: { userId: req.params.id, planId: plan.id, status: 'ACTIVE', startsAt: new Date(), endsAt },
      include: { plan: true }
    });
  });

  res.status(201).json({ subscription: publicSubscription(subscription) });
}));

router.get('/payments', asyncHandler(async (req, res) => {
  const payments = await prisma.payment.findMany({
    include: { user: true, plan: true },
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  res.json({
    payments: payments.map((payment) => ({
      ...publicPayment(payment),
      user: publicUser(payment.user),
      plan: payment.plan?.name
    }))
  });
}));

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  res.json({ logs });
}));

export default router;
