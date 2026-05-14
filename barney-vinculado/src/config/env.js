import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:5500,http://127.0.0.1:5500,http://localhost:5173'),
  DATA_ENCRYPTION_KEY: z.string().min(32, 'DATA_ENCRYPTION_KEY precisa ser configurada'),
  ADMIN_EMAIL: z.string().email().default('admin@barney.com'),
  ADMIN_PASSWORD: z.string().min(8).default('admin123456'),
  ADMIN_NAME: z.string().default('Administrador Barney'),
  PIX_KEY: z.string().optional().default(''),
  PIX_MERCHANT_NAME: z.string().optional().default('BARNEY FINANCE'),
  PIX_MERCHANT_CITY: z.string().optional().default('IGARAPE'),
  OPENAI_API_KEY: z.string().optional().default(''),
  WHATSAPP_API_TOKEN: z.string().optional().default('')
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Erro nas variáveis de ambiente:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
