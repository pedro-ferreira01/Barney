import { ZodError } from 'zod';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Rota não encontrada', path: req.originalUrl });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.flatten().fieldErrors
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Registro duplicado' });
  }

  const status = err.statusCode || err.status || 500;
  const message = status >= 500 ? 'Erro interno do servidor' : err.message;

  if (status >= 500) {
    console.error(err);
  }

  return res.status(status).json({
    error: message,
    details: err.details
  });
}
