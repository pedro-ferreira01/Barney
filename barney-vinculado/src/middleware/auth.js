import { prisma } from '../config/prisma.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { HttpError } from '../utils/http-error.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new HttpError(401, 'Token de acesso ausente');
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new HttpError(401, 'Usuário inválido ou bloqueado');
    }

    req.user = user;
    next();
  } catch (error) {
    next(new HttpError(401, 'Sessão inválida ou expirada'));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Acesso negado'));
    }
    return next();
  };
}

export async function requireActiveSubscription(req, res, next) {
  try {
    if (req.user.role === 'ADMIN') return next();
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: 'ACTIVE',
        endsAt: { gt: new Date() }
      }
    });
    if (!subscription) {
      throw new HttpError(402, 'Plano ativo necessário para acessar esta ferramenta');
    }
    req.subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
}
