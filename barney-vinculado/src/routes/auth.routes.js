import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '../config/prisma.js';
import { authLimiter } from '../middleware/security.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import { comparePassword, encryptText, hashPassword, sha256 } from '../utils/crypto.js';
import { createRefreshToken, refreshTokenExpiry, signAccessToken } from '../utils/jwt.js';
import { publicSubscription, publicUser } from '../utils/serializers.js';
import { audit } from '../middleware/audit.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(3).max(120),
  email: z.string().email().max(180).transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(100),
  phone: z.string().min(10).max(20).optional(),
  cpf: z.string().min(11).max(20).optional()
});

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
  password: z.string().min(1)
});

async function issueTokens(user, req) {
  const accessToken = signAccessToken(user);
  const refreshToken = createRefreshToken();

  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(refreshToken),
      userId: user.id,
      expiresAt: refreshTokenExpiry()
    }
  });

  await audit(user.id, 'AUTH_TOKEN_ISSUED', {}, req);
  return { accessToken, refreshToken };
}

router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'STUDENT',
      phoneCipher: data.phone ? encryptText(data.phone.replace(/\D/g, '')) : null,
      cpfCipher: data.cpf ? encryptText(data.cpf.replace(/\D/g, '')) : null
    }
  });

  const tokens = await issueTokens(user, req);
  await audit(user.id, 'USER_REGISTERED', { email: user.email }, req);

  res.status(201).json({ user: publicUser(user), ...tokens });
}));

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user || !user.isActive) {
    throw new HttpError(401, 'Email ou senha inválidos');
  }

  const ok = await comparePassword(data.password, user.passwordHash);
  if (!ok) {
    await audit(user.id, 'AUTH_LOGIN_FAILED', {}, req);
    throw new HttpError(401, 'Email ou senha inválidos');
  }

  const tokens = await issueTokens(user, req);
  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id, status: 'ACTIVE', endsAt: { gt: new Date() } },
    include: { plan: true },
    orderBy: { endsAt: 'desc' }
  });

  await audit(user.id, 'AUTH_LOGIN_SUCCESS', {}, req);
  res.json({ user: publicUser(user), subscription: publicSubscription(subscription), ...tokens });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const schema = z.object({ refreshToken: z.string().min(20) });
  const { refreshToken } = schema.parse(req.body);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: true }
  });

  if (!record || record.revokedAt || record.expiresAt < new Date() || !record.user.isActive) {
    throw new HttpError(401, 'Refresh token inválido');
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() }
  });

  const tokens = await issueTokens(record.user, req);
  res.json({ user: publicUser(record.user), ...tokens });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const schema = z.object({ refreshToken: z.string().min(20).optional() });
  const { refreshToken } = schema.parse(req.body);

  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), userId: req.user.id },
      data: { revokedAt: new Date() }
    });
  } else {
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  await audit(req.user.id, 'AUTH_LOGOUT', { requestId: nanoid(10) }, req);
  res.json({ ok: true });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const subscription = await prisma.subscription.findFirst({
    where: { userId: req.user.id, status: 'ACTIVE', endsAt: { gt: new Date() } },
    include: { plan: true },
    orderBy: { endsAt: 'desc' }
  });

  res.json({ user: publicUser(req.user), subscription: publicSubscription(subscription) });
}));

export default router;
