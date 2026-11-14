import { Router } from 'express';
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

authRouter.get('/status', (req, res) => {
  const token = req.cookies?.radar_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const authenticated = token ? verifyToken(token) : false;

  res.json({
    hasUser: hasUser(),
    authenticated
  });
});

authRouter.post('/setup', (req, res) => {
  const body = SetupSenhaSchema.parse(req.body);
  try {
    setupPassword(body.senha);
    const token = generateToken();
    res.cookie('radar_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ ok: true, message: 'Senha inicial configurada com sucesso!' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao configurar senha' });
  }
});

authRouter.post('/login', loginRateLimiter, (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const body = LoginSchema.parse(req.body);

  if (!hasUser()) {
    res.status(400).json({ error: 'Nenhum usuário configurado. Crie uma senha inicial primeiro.' });
    return;
  }

  const ok = verifyPassword(body.senha);
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
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('radar_token');
  res.json({ ok: true });
});

authRouter.put('/senha', requireAuth, (req, res) => {
  const body = TrocarSenhaSchema.parse(req.body);
  try {
    changePassword(body.senhaAtual, body.novaSenha);
    res.json({ ok: true, message: 'Senha atualizada com sucesso!' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao trocar senha' });
  }
});
