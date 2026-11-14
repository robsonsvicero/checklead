import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'radar-leads-secret-key-local-98741';
const JWT_EXPIRES_IN = '7d';

export function hasUser(): boolean {
  const db = getDb();
  const user = db.prepare('SELECT id FROM usuarios LIMIT 1').get();
  return !!user;
}

export function setupPassword(senha: string): boolean {
  const db = getDb();
  if (hasUser()) {
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

export function verifyPassword(senha: string): boolean {
  const db = getDb();
  const user = db.prepare('SELECT senha_hash FROM usuarios LIMIT 1').get() as { senha_hash: string } | undefined;
  if (!user) {
    return false;
  }

  return bcrypt.compareSync(senha, user.senha_hash);
}

export function changePassword(senhaAtual: string, novaSenha: string): boolean {
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
  return jwt.sign({ sub: 'dono', role: 'owner' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}
