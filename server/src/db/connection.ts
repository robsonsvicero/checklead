import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabaseProvider } from './supabase.js';

let instance: DatabaseSync | null = null;

export function getDb(customPath?: string): DatabaseSync {
  if (getDatabaseProvider() !== 'sqlite') {
    throw new Error('O acesso SQLite foi solicitado enquanto DATABASE_PROVIDER=supabase.');
  }

  if (instance && !customPath) {
    return instance;
  }

  const dbPath = customPath || process.env.DATABASE_PATH || path.resolve(process.cwd(), 'radar.sqlite');
  
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);
  
  // Pragmas de integridade e desempenho
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  if (!customPath) {
    instance = db;
  }

  return db;
}

export function setDb(db: DatabaseSync | null) {
  instance = db;
}

export function closeDb() {
  if (instance) {
    try {
      instance.close();
    } catch {}
    instance = null;
  }
}
