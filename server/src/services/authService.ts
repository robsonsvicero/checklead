import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/connection.js';
import { getDatabaseProvider, getSupabaseClient, throwSupabaseError } from '../db/supabase.js';

const JWT_EXPIRES_IN = '7d';

export async function hasUser(): Promise<boolean> {
  if (getDatabaseProvider() === 'supabase') {
    const { data, error } = await getSupabaseClient()
      .from('usuarios')
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
    if (await hasUser()) {
      throw new Error('Usuário já configurado');
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(senha, salt);
    const { error } = await getSupabaseClient().from('usuarios').insert({
      senha_hash: hash,
      criado_em: new Date().toISOString()
    });
    throwSupabaseError(error);
    return true;
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
    const { data, error } = await getSupabaseClient()
      .from('usuarios')
      .select('senha_hash')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    throwSupabaseError(error);
    return data ? bcrypt.compareSync(senha, data.senha_hash) : false;
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
    const client = getSupabaseClient();
    const { data: user, error: selectError } = await client
      .from('usuarios')
      .select('id, senha_hash')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    throwSupabaseError(selectError);

    if (!user) throw new Error('Nenhum usuário cadastrado');
    if (!bcrypt.compareSync(senhaAtual, user.senha_hash)) {
      throw new Error('Senha atual incorreta');
    }

    const hash = bcrypt.hashSync(novaSenha, bcrypt.genSaltSync(10));
    const { error: updateError } = await client
      .from('usuarios')
      .update({ senha_hash: hash })
      .eq('id', user.id);
    throwSupabaseError(updateError);
    return true;
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
