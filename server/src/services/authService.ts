import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import type { AuthUser, UserSummary } from '@radar/shared';
import { getDb } from '../db/connection.js';
import {
  createSupabaseAuthClient,
  getDatabaseProvider,
  getSupabaseClient,
  throwSupabaseError
} from '../db/supabase.js';

const JWT_EXPIRES_IN = '7d';
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export interface AuthSessionTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthenticatedSession {
  user: AuthUser;
  session: AuthSessionTokens | null;
}

export async function hasUser(): Promise<boolean> {
  if (getDatabaseProvider() === 'supabase') {
    const { data, error } = await getSupabaseClient()
      .from('perfis')
      .select('id')
      .limit(1);
    throwSupabaseError(error);
    return (data || []).length > 0;
  }

  const db = getDb();
  const user = db.prepare('SELECT id FROM usuarios LIMIT 1').get();
  return !!user;
}

export async function setupPassword(senha: string): Promise<boolean> {
  if (getDatabaseProvider() === 'supabase') {
    throw new Error('No Supabase, as contas são criadas por convite no painel de usuários.');
  }

  const db = getDb();
  if (await hasUser()) {
    throw new Error('Usuário já configurado');
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(senha, salt);

  db.prepare(`
    INSERT INTO usuarios (senha_hash, criado_em)
    VALUES (?, ?)
  `).run(hash, new Date().toISOString());

  return true;
}

export async function verifyPassword(senha: string): Promise<boolean> {
  if (getDatabaseProvider() === 'supabase') {
    throw new Error('O login do Supabase deve usar e-mail e senha.');
  }

  const db = getDb();
  const user = db.prepare('SELECT senha_hash FROM usuarios LIMIT 1').get() as { senha_hash: string } | undefined;
  if (!user) {
    return false;
  }

  return bcrypt.compareSync(senha, user.senha_hash);
}

export async function changePassword(senhaAtual: string, novaSenha: string): Promise<boolean> {
  if (getDatabaseProvider() === 'supabase') {
    throw new Error('Informe a conta autenticada para alterar a senha do Supabase.');
  }

  const db = getDb();
  const user = db.prepare('SELECT id, senha_hash FROM usuarios LIMIT 1').get() as { id: number; senha_hash: string } | undefined;
  if (!user) {
    throw new Error('Nenhum usuário cadastrado');
  }

  const valida = bcrypt.compareSync(senhaAtual, user.senha_hash);
  if (!valida) {
    throw new Error('Senha atual incorreta');
  }

  const salt = bcrypt.genSaltSync(10);
  const novoHash = bcrypt.hashSync(novaSenha, salt);

  db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(novoHash, user.id);
  return true;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthenticatedSession> {
  const { data, error } = await createSupabaseAuthClient().auth.signInWithPassword({ email, password });
  if (error) {
    if (isInvalidAuthError(error)) throw new Error('E-mail ou senha incorretos.');
    throw error;
  }
  if (!data.user || !data.session) throw new Error('O Supabase não retornou uma sessão válida.');

  const user = await getProfile(data.user.id);
  if (!user) throw new Error('A conta não possui um perfil ativo. Peça ao administrador para reenviar o convite.');

  return {
    user,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in
    }
  };
}

export async function getAuthenticatedSession(
  accessToken?: string,
  refreshToken?: string
): Promise<AuthenticatedSession | null> {
  if (!accessToken && !refreshToken) return null;

  let session: AuthSessionTokens | null = null;
  let authUser = accessToken
    ? await getSupabaseClient().auth.getUser(accessToken)
    : { data: { user: null }, error: null };

  if (!authUser.data.user && refreshToken) {
    const refreshed = await createSupabaseAuthClient().auth.refreshSession({
      refresh_token: refreshToken
    });
    if (refreshed.error) {
      if (isInvalidAuthError(refreshed.error)) return null;
      throw refreshed.error;
    }
    if (!refreshed.data.user || !refreshed.data.session) return null;

    authUser = {
      data: { user: refreshed.data.user },
      error: null
    };
    session = {
      access_token: refreshed.data.session.access_token,
      refresh_token: refreshed.data.session.refresh_token,
      expires_in: refreshed.data.session.expires_in
    };
  }

  if (authUser.error) {
    if (isInvalidAuthError(authUser.error)) return null;
    throw authUser.error;
  }
  if (!authUser.data.user) return null;

  const user = await getProfile(authUser.data.user.id);
  if (!user) throw new Error('O perfil desta conta não existe no Supabase. Verifique a migração de autenticação.');
  return { user, session };
}

export async function completeInvitation(
  accessToken: string,
  refreshToken: string,
  newPassword: string
): Promise<AuthenticatedSession> {
  return completePasswordFromEmailTokens(
    accessToken,
    refreshToken,
    newPassword,
    'O convite expirou ou não é válido. Peça um novo convite.',
    'O perfil do convite não foi encontrado.'
  );
}

export async function completePasswordRecovery(
  accessToken: string,
  refreshToken: string,
  newPassword: string
): Promise<AuthenticatedSession> {
  return completePasswordFromEmailTokens(
    accessToken,
    refreshToken,
    newPassword,
    'O link de redefinição expirou ou não é válido. Solicite um novo link.',
    'O perfil desta conta não foi encontrado.'
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = getAuthRedirectUrl('/login', 'links de redefinição de senha');
  const { error } = await createSupabaseAuthClient().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

async function completePasswordFromEmailTokens(
  accessToken: string,
  refreshToken: string,
  newPassword: string,
  invalidTokensMessage: string,
  missingProfileMessage: string
): Promise<AuthenticatedSession> {
  const { data: tokenData, error: tokenError } = await getSupabaseClient().auth.getUser(accessToken);
  if (tokenError) {
    if (isInvalidAuthError(tokenError)) throw new Error(invalidTokensMessage);
    throw tokenError;
  }
  if (!tokenData.user) throw new Error(invalidTokensMessage);

  const refreshed = await createSupabaseAuthClient().auth.refreshSession({
    refresh_token: refreshToken
  });
  if (refreshed.error) {
    if (isInvalidAuthError(refreshed.error)) throw new Error(invalidTokensMessage);
    throw refreshed.error;
  }
  if (!refreshed.data.user || !refreshed.data.session || refreshed.data.user.id !== tokenData.user.id) {
    throw new Error(invalidTokensMessage);
  }

  const { error: updateError } = await getSupabaseClient().auth.admin.updateUserById(
    tokenData.user.id,
    { password: newPassword }
  );
  if (updateError) throw updateError;

  const user = await getProfile(tokenData.user.id);
  if (!user) throw new Error(missingProfileMessage);

  return {
    user,
    session: {
      access_token: refreshed.data.session.access_token,
      refresh_token: refreshed.data.session.refresh_token,
      expires_in: refreshed.data.session.expires_in
    }
  };
}

export async function changeSupabasePassword(userId: string, newPassword: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.admin.updateUserById(userId, {
    password: newPassword
  });
  if (error) throw error;
}

export async function inviteUserByEmail(email: string): Promise<void> {
  const redirectTo = getAuthRedirectUrl('/login?convite=1', 'convites');

  const { data: existingUser, error: lookupError } = await getSupabaseClient()
    .from('perfis')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  throwSupabaseError(lookupError);
  if (existingUser) throw new Error('Já existe uma conta ou convite para este e-mail.');

  const { error } = await getSupabaseClient().auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) throw error;
}

function getAuthRedirectUrl(path: string, purpose: string): string {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) throw new Error(`Configure APP_URL no servidor para enviar ${purpose}.`);

  try {
    const redirectUrl = new URL(path, appUrl);
    if (process.env.NODE_ENV === 'production' && redirectUrl.protocol !== 'https:') {
      throw new Error('APP_URL deve usar HTTPS em produção.');
    }
    return redirectUrl.toString();
  } catch (error) {
    if (error instanceof Error && error.message === 'APP_URL deve usar HTTPS em produção.') throw error;
    throw new Error('APP_URL deve ser uma URL válida.');
  }
}

export async function listUsers(): Promise<UserSummary[]> {
  const { data, error } = await getSupabaseClient()
    .from('perfis')
    .select('id, email, role, criado_em')
    .order('criado_em', { ascending: true });
  throwSupabaseError(error);

  return (data || []).map(profile => {
    if (profile.role !== 'admin' && profile.role !== 'user') {
      throw new Error(`Perfil ${profile.id} possui um papel inválido.`);
    }
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      created_at: profile.criado_em
    };
  });
}

export async function deleteUserAccount(userId: string, actingUserId: string): Promise<void> {
  if (userId === actingUserId) {
    throw new Error('Não é permitido excluir a própria conta.');
  }

  const { data: profile, error: profileError } = await getSupabaseClient()
    .from('perfis')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();
  throwSupabaseError(profileError);
  if (!profile) throw new Error('Conta não encontrada.');

  if (profile.role === 'admin') {
    const { count, error: countError } = await getSupabaseClient()
      .from('perfis')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');
    throwSupabaseError(countError);
    if (count === null) throw new Error('Não foi possível verificar os administradores ativos.');
    if (count <= 1) throw new Error('Não é possível excluir o último administrador.');
  }

  const { error: deleteError } = await getSupabaseClient().auth.admin.deleteUser(userId);
  throwSupabaseError(deleteError);
}

export function setSessionCookies(res: Response, session: AuthSessionTokens): void {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('supabase_access_token', session.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: Math.max(session.expires_in, 1) * 1000
  });
  res.cookie('supabase_refresh_token', session.refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE
  });
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie('radar_token', { path: '/' });
  res.clearCookie('supabase_access_token', { path: '/' });
  res.clearCookie('supabase_refresh_token', { path: '/' });
}

async function getProfile(id: string): Promise<AuthUser | null> {
  const { data, error } = await getSupabaseClient()
    .from('perfis')
    .select('id, email, role')
    .eq('id', id)
    .maybeSingle();
  throwSupabaseError(error);
  if (!data) return null;
  if (data.role !== 'admin' && data.role !== 'user') {
    throw new Error(`Perfil ${data.id} possui um papel inválido.`);
  }
  return { id: data.id, email: data.email, role: data.role };
}

function isInvalidAuthError(error: { status?: number }): boolean {
  return error.status === 400 || error.status === 401 || error.status === 403 || error.status === 404;
}

export function getSessionTokens(req: { cookies?: Record<string, string>; headers: { authorization?: string } }): {
  accessToken?: string;
  refreshToken?: string;
} {
  return {
    accessToken: req.cookies?.supabase_access_token
      || req.headers.authorization?.replace(/^Bearer\s+/i, ''),
    refreshToken: req.cookies?.supabase_refresh_token
  };
}

export function setLocalSessionCookie(res: Response, token: string): void {
  res.cookie('radar_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function generateToken(): string {
  return jwt.sign({ sub: 'dono', role: 'owner' }, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}

export function assertJwtSecretConfigured(): void {
  getJwtSecret();
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET precisa ser configurada em produção.');
  }
  return secret || 'radar-leads-secret-key-local-98741';
}
