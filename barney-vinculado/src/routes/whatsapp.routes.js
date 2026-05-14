import { Router } from 'express';
import { z } from 'zod';
import { requireActiveSubscription, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.post('/test-message', requireAuth, requireActiveSubscription, asyncHandler(async (req, res) => {
  const schema = z.object({ phone: z.string().min(10).max(20), name: z.string().min(2).max(80).optional() });
  const { phone, name } = schema.parse(req.body);
  const digits = phone.replace(/\D/g, '');
  const message = `Olá${name ? `, ${name}` : ''}! Seu Barney AI Finance está conectado e pronto para enviar alertas financeiros.`;

  res.json({
    status: 'manual_whatsapp_link_created',
    whatsappUrl: `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`,
    message
  });
}));

export default router;
