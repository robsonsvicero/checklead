import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const mensagens = err.issues.map(e => `${e.path.join('.')}: ${e.message}`);
    res.status(400).json({
      error: 'Erro de validação dos dados',
      detalhes: mensagens
    });
    return;
  }

  console.error('Erro não tratado na API:', err);
  res.status(500).json({
    error: err?.message || 'Ocorreu um erro interno no servidor.'
  });
}
