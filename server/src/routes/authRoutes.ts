import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { SetupSenhaSchema, LoginSchema, TrocarSenhaSchema } from '@radar/shared';
import {
  hasUser,
  setupPassword,
  verifyPassword,
  generateToken,
  changePassword,
  verifyToken
} from '../services/authService.js';
import { loginRateLimiter, registerFailedLogin, resetLoginAttempts } from '../middlewares/rateLimit.js';
import { requireAuth } from '../middlewares/auth.js';

export const authRouter = Router();

authRouter.get('/status', asyncHandler(async (req, res) => {
  const token = req.cookies?.radar_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const authenticated = token ? verifyToken(token) : false;

  res.json({
    hasUser: await hasUser(),
    authenticated
  });
}));

authRouter.post('/setup', asyncHandler(async (req, res, next) => {
  const body = SetupSenhaSchema.parse(req.body);
  try {
    await setupPassword(body.senha);
    const token = generateToken();
    res.cookie('radar_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ ok: true, message: 'Senha inicial configurada com sucesso!' });
  } catch (err: any) {
    if (err.message === 'Usuário já configurado') {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
}));

authRouter.post('/login', loginRateLimiter, asyncHandler(async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const body = LoginSchema.parse(req.body);

  if (!await hasUser()) {
    res.status(400).json({ error: 'Nenhum usuário configurado. Crie uma senha inicial primeiro.' });
    return;
  }

  const ok = await verifyPassword(body.senha);
  if (!ok) {
    registerFailedLogin(ip);
    res.status(401).json({ error: 'Senha incorreta.' });
    return;
  }

  resetLoginAttempts(ip);
  const token = generateToken();
  res.cookie('radar_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ ok: true });
}));

authRouter.post('/logout', (req, res) => {
  res.clearCookie('radar_token');
  res.json({ ok: true });
});

authRouter.put('/senha', requireAuth, asyncHandler(async (req, res, next) => {
  const body = TrocarSenhaSchema.parse(req.body);
  try {
    await changePassword(body.senhaAtual, body.novaSenha);
    res.json({ ok: true, message: 'Senha atualizada com sucesso!' });
  } catch (err: any) {
    if (err.message === 'Nenhum usuário cadastrado' || err.message === 'Senha atual incorreta') {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
}));
