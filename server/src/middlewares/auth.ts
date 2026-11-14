import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Busca token nos cookies ou no header Authorization
  const token = req.cookies?.radar_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
    return;
  }

  const valid = verifyToken(token);
  if (!valid) {
    res.status(401).json({ error: 'Sessão expirada ou inválida.' });
    return;
  }

  next();
}
