import type { NextFunction, Request, Response } from 'express';
import type { AuthUser } from '@radar/shared';
import { getDatabaseProvider } from '../db/supabase.js';
import {
  getAuthenticatedSession,
  getSessionTokens,
  setSessionCookies,
  verifyToken
} from '../services/authService.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void authenticateRequest(req, res).then(user => {
    if (!user) {
      res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login para continuar.' });
      return;
    }
    req.authUser = user;
    next();
  }).catch(next);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.authUser?.role !== 'admin') {
    res.status(403).json({ error: 'Somente administradores podem gerenciar usuários.' });
    return;
  }
  next();
}

export function getAuthenticatedUser(req: Request): AuthUser {
  if (!req.authUser) {
    throw new Error('Usuário autenticado não encontrado na requisição.');
  }
  return req.authUser;
}

async function authenticateRequest(req: Request, res: Response): Promise<AuthUser | null> {
  if (getDatabaseProvider() === 'sqlite') {
    const token = req.cookies?.radar_token
      || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token || !verifyToken(token)) return null;

    return { id: 'local-owner', email: null, role: 'admin' };
  }

  const { accessToken, refreshToken } = getSessionTokens(req);
  const session = await getAuthenticatedSession(accessToken, refreshToken);
  if (!session) return null;

  if (session.session) setSessionCookies(res, session.session);
  return session.user;
}
