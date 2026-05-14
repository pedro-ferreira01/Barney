import express from 'express';
import morgan from 'morgan';
import { applySecurity } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { env } from './config/env.js';

import authRoutes from './routes/auth.routes.js';
import plansRoutes from './routes/plans.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import subscriptionsRoutes from './routes/subscriptions.routes.js';
import transactionsRoutes from './routes/transactions.routes.js';
import investmentsRoutes from './routes/investments.routes.js';
import filesRoutes from './routes/files.routes.js';
import aiRoutes from './routes/ai.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import adminRoutes from './routes/admin.routes.js';
import healthRoutes from './routes/health.routes.js';

export const app = express();

applySecurity(app);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/', (req, res) => {
  res.json({
    name: 'Barney AI Finance API',
    status: 'online',
    docs: '/api/health'
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/investments', investmentsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
