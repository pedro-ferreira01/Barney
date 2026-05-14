import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { publicSubscription } from '../utils/serializers.js';

const router = Router();

router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId: req.user.id, status: 'ACTIVE', endsAt: { gt: new Date() } },
    include: { plan: true },
    orderBy: { endsAt: 'desc' }
  });
  res.json({ subscription: publicSubscription(subscription), active: Boolean(subscription) });
}));

export default router;
