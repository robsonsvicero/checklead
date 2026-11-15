import { Router } from 'express';
import {
  AlterarSenhaSchema,
  CompleteInvitationSchema,
  EmailLoginSchema,
  InviteEmailSchema,
  LoginSchema,
  SetupSenhaSchema,
  TrocarSenhaSchema
} from '@radar/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { getAuthenticatedUser, requireAdmin, requireAuth } from '../middlewares/auth.js';
import { getDatabaseProvider } from '../db/supabase.js';
import {
  changePassword,
  changeSupabasePassword,
  clearSessionCookies,
  completeInvitation,
  completePasswordRecovery,
  generateToken,
  getAuthenticatedSession,
  getSessionTokens,
  hasUser,
  inviteUserByEmail,
  listUsers,
  setLocalSessionCookie,
  setSessionCookies,
  signInWithEmail,
  setupPassword,
  verifyPassword,
  verifyToken
} from '../services/authService.js';
import { loginRateLimiter, registerFailedLogin, resetLoginAttempts } from '../middlewares/rateLimit.js';

export const authRouter = Router();

authRouter.get('/status', asyncHandler(async (req, res) => {
  const provider = getDatabaseProvider();
  if (provider === 'sqlite') {
    const token = req.cookies?.radar_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const authenticated = token ? verifyToken(token) : false;
    res.json({
      hasUser: await hasUser(),
      authenticated,
      provider,
      user: authenticated ? { id: 'local-owner', email: null, role: 'admin' } : null
    });
    return;
  }

  const { accessToken, refreshToken } = getSessionTokens(req);
  const session = await getAuthenticatedSession(accessToken, refreshToken);
  if (session?.session) setSessionCookies(res, session.session);
  res.json({
    hasUser: await hasUser(),
    authenticated: Boolean(session),
    provider,
    user: session?.user ?? null
  });
}));

authRouter.post('/setup', asyncHandler(async (req, res) => {
  if (getDatabaseProvider() !== 'sqlite') {
    res.status(403).json({ error: 'No Supabase, a conta inicial deve ser criada no painel do projeto.' });
    return;
  }

  const body = SetupSenhaSchema.parse(req.body);
  if (await hasUser()) {
    res.status(400).json({ error: 'Usuário já configurado' });
    return;
  }

  await setupPassword(body.senha);
  setLocalSessionCookie(res, generateToken());
  res.json({ ok: true, message: 'Senha inicial configurada com sucesso!' });
}));

authRouter.post('/login', loginRateLimiter, asyncHandler(async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (getDatabaseProvider() === 'sqlite') {
    const body = LoginSchema.parse(req.body);
    if (!await hasUser()) {
      res.status(400).json({ error: 'Nenhum usuário configurado. Crie uma senha inicial primeiro.' });
      return;
    }

    if (!await verifyPassword(body.senha)) {
      registerFailedLogin(ip);
      res.status(401).json({ error: 'Senha incorreta.' });
      return;
    }

    resetLoginAttempts(ip);
    setLocalSessionCookie(res, generateToken());
    res.json({ ok: true });
    return;
  }

  const body = EmailLoginSchema.parse(req.body);
  try {
    const session = await signInWithEmail(body.email, body.senha);
    resetLoginAttempts(ip);
    if (session.session) setSessionCookies(res, session.session);
    res.json({ ok: true, user: session.user });
  } catch (error) {
    if (error instanceof Error && error.message === 'E-mail ou senha incorretos.') {
      registerFailedLogin(ip);
      res.status(401).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

authRouter.post('/accept-invitation', asyncHandler(async (req, res) => {
  if (getDatabaseProvider() !== 'supabase') {
    res.status(404).json({ error: 'Convites estão disponíveis somente quando o Supabase está ativo.' });
    return;
  }

  const body = CompleteInvitationSchema.parse(req.body);
  const session = await completeInvitation(body.accessToken, body.refreshToken, body.novaSenha);
  if (session.session) setSessionCookies(res, session.session);
  res.json({ ok: true, user: session.user });
}));

authRouter.post('/complete-password-recovery', asyncHandler(async (req, res) => {
  if (getDatabaseProvider() !== 'supabase') {
    res.status(404).json({ error: 'A recuperação de senha está disponível somente quando o Supabase está ativo.' });
    return;
  }

  const body = CompleteInvitationSchema.parse(req.body);
  try {
    const session = await completePasswordRecovery(body.accessToken, body.refreshToken, body.novaSenha);
    if (session.session) setSessionCookies(res, session.session);
    res.json({ ok: true, user: session.user });
  } catch (error) {
    if (error instanceof Error && error.message === 'O link de redefinição expirou ou não é válido. Solicite um novo link.') {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
}));

authRouter.post('/logout', (req, res) => {
  clearSessionCookies(res);
  res.json({ ok: true });
});

authRouter.put('/senha', requireAuth, asyncHandler(async (req, res) => {
  if (getDatabaseProvider() === 'supabase') {
    const body = AlterarSenhaSchema.parse(req.body);
    const user = getAuthenticatedUser(req);
    await changeSupabasePassword(user.id, body.novaSenha);
  } else {
    const body = TrocarSenhaSchema.parse(req.body);
    await changePassword(body.senhaAtual, body.novaSenha);
  }
  res.json({ ok: true, message: 'Senha atualizada com sucesso!' });
}));

authRouter.get('/users', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  if (getDatabaseProvider() !== 'supabase') {
    res.status(404).json({ error: 'Gerenciamento de usuários está disponível somente com Supabase.' });
    return;
  }
  res.json(await listUsers());
}));

authRouter.post('/invitations', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  if (getDatabaseProvider() !== 'supabase') {
    res.status(404).json({ error: 'Convites estão disponíveis somente quando o Supabase está ativo.' });
    return;
  }

  const { email } = InviteEmailSchema.parse(req.body);
  try {
    await inviteUserByEmail(email);
  } catch (error) {
    if (error instanceof Error && error.message === 'Já existe uma conta ou convite para este e-mail.') {
      res.status(409).json({ error: error.message });
      return;
    }
    throw error;
  }
  res.status(202).json({ ok: true, message: 'Convite enviado.' });
}));
