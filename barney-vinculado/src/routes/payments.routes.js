import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import { buildPixPayload } from '../utils/pix.js';
import { publicPayment } from '../utils/serializers.js';
import { audit } from '../middleware/audit.js';

// ✅ NOVO IMPORT (CAKTO)
import { createCaktoCheckout, normalizeCaktoWebhook } from '../services/payments.js';

const router = Router();


// =======================
// PIX (já existente)
// =======================
router.post('/pix', requireAuth, asyncHandler(async (req, res) => {
  const schema = z.object({ planCode: z.string().min(2).max(40) });
  const { planCode } = schema.parse(req.body);

  const plan = await prisma.plan.findUnique({
    where: { code: planCode.toLowerCase() }
  });

  if (!plan || !plan.isActive) {
    throw new HttpError(404, 'Plano não encontrado');
  }

  const txid = `BARNEY${nanoid(12).toUpperCase()}`.slice(0, 25);

  const pixPayload = buildPixPayload({
    amount: plan.priceCents / 100,
    description: `Barney ${plan.name}`,
    txid
  });

  const payment = await prisma.payment.create({
    data: {
      userId: req.user.id,
      planId: plan.id,
      amountCents: plan.priceCents,
      method: 'PIX',
      provider: 'MANUAL_PIX',
      providerRef: txid,
      pixPayload
    }
  });

  await audit(req.user.id, 'PAYMENT_PIX_CREATED', {
    paymentId: payment.id,
    planCode
  }, req);

  res.status(201).json({ payment: publicPayment(payment) });
}));


// =======================
// ✅ NOVO CHECKOUT CAKTO
// =======================
router.post('/checkout', requireAuth, asyncHandler(async (req, res) => {
  const schema = z.object({ planCode: z.string().min(2).max(40) });
  const { planCode } = schema.parse(req.body);

  const plan = await prisma.plan.findUnique({
    where: { code: planCode.toLowerCase() }
  });

  if (!plan || !plan.isActive) {
    throw new HttpError(404, 'Plano não encontrado');
  }

  const orderId = `order_${nanoid(10)}`;

  // 🔥 cria checkout fake
  const checkout = await createCaktoCheckout({
    orderId,
    plan: plan.code,
    user: req.user
  });

  // 🔥 salva no banco (IMPORTANTE)
  const payment = await prisma.payment.create({
    data: {
      userId: req.user.id,
      planId: plan.id,
      amountCents: plan.priceCents,
      method: 'PIX',
      provider: 'CAKTO',
      providerRef: orderId,
      status: 'PENDING'
    }
  });

  await audit(req.user.id, 'PAYMENT_CAKTO_CREATED', {
    paymentId: payment.id,
    planCode
  }, req);

  res.json({
    ...checkout,
    paymentId: payment.id
  });
}));


// =======================
// ✅ WEBHOOK CAKTO
// =======================
router.post('/webhook/cakto', asyncHandler(async (req, res) => {
  const data = normalizeCaktoWebhook(req.body);

  if (data.paid) {
    console.log('Pagamento aprovado:', data.orderId);

    const payment = await prisma.payment.findFirst({
      where: { providerRef: data.orderId },
      include: { plan: true }
    });

    if (!payment) {
      return res.sendStatus(200);
    }

    if (payment.status === 'PAID') {
      return res.sendStatus(200);
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setMonth(endsAt.getMonth() + payment.plan.durationMonths);

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paidAt: new Date()
        }
      });

      await tx.subscription.updateMany({
        where: {
          userId: payment.userId,
          status: 'ACTIVE'
        },
        data: { status: 'CANCELLED' }
      });

      await tx.subscription.create({
        data: {
          userId: payment.userId,
          planId: payment.planId,
          status: 'ACTIVE',
          startsAt,
          endsAt
        }
      });
    });

    console.log('Plano liberado automaticamente ✅');
  }

  res.sendStatus(200);
}));


// =======================
// LISTAR PAGAMENTOS
// =======================
router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const payments = await prisma.payment.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  res.json({ payments: payments.map(publicPayment) });
}));


// =======================
// APROVAÇÃO MANUAL (ADMIN)
// =======================
router.post('/:id/approve', requireAuth, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { plan: true, user: true }
  });

  if (!payment) throw new HttpError(404, 'Pagamento não encontrado');
  if (payment.status === 'PAID') throw new HttpError(409, 'Pagamento já aprovado');

  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  endsAt.setMonth(endsAt.getMonth() + payment.plan.durationMonths);

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: new Date() }
    });

    await tx.subscription.updateMany({
      where: { userId: payment.userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' }
    });

    const subscription = await tx.subscription.create({
      data: {
        userId: payment.userId,
        planId: payment.planId,
        status: 'ACTIVE',
        startsAt,
        endsAt
      },
      include: { plan: true }
    });

    return { updatedPayment, subscription };
  });

  await audit(req.user.id, 'PAYMENT_APPROVED', {
    paymentId: payment.id,
    targetUserId: payment.userId
  }, req);

  res.json({
    payment: publicPayment(result.updatedPayment),
    subscription: result.subscription
  });
}));

export default router;