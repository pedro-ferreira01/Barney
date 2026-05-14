import { prisma } from '../config/prisma.js';

export async function audit(userId, action, metadata = {}, req = undefined) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        metadata: JSON.stringify(metadata || {}),
        ip: req?.ip || null
      }
    });
  } catch (error) {
    console.warn('Falha ao registrar auditoria:', error.message);
  }
}
