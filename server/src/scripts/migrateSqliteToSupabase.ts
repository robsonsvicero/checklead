import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { getSupabaseClient, throwSupabaseError } from '../db/supabase.js';

const databasePath = path.resolve(process.env.DATABASE_PATH || path.resolve(process.cwd(), 'radar.sqlite'));
const dryRun = process.argv.includes('--dry-run');

if (!fs.existsSync(databasePath)) {
  throw new Error(`Banco SQLite não encontrado em ${databasePath}`);
}

const db = new DatabaseSync(databasePath, { readOnly: true });

try {
  const tables = new Set(
    (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>)
      .map(table => table.name)
  );
  for (const table of ['leads', 'interacoes', 'configuracoes', 'usuarios']) {
    if (!tables.has(table)) {
      throw new Error(`Tabela obrigatória ausente no SQLite: ${table}`);
    }
  }

  const payload = {
    leads: db.prepare('SELECT * FROM leads ORDER BY id ASC').all(),
    interacoes: db.prepare('SELECT * FROM interacoes ORDER BY id ASC').all(),
    configuracoes: db.prepare('SELECT * FROM configuracoes WHERE id = 1').get() || null,
    usuarios: db.prepare('SELECT * FROM usuarios ORDER BY id ASC').all()
  };
  const counts = {
    leads: payload.leads.length,
    interacoes: payload.interacoes.length,
    usuarios: payload.usuarios.length
  };

  if (dryRun) {
    console.log(`Prévia local: ${counts.leads} leads, ${counts.interacoes} interações e ${counts.usuarios} usuário(s). Nada foi enviado.`);
  } else {
    if (process.env.DATABASE_PROVIDER !== 'supabase') {
      throw new Error('Defina DATABASE_PROVIDER=supabase antes de executar a migração.');
    }

    const { data, error } = await getSupabaseClient().rpc('migrar_backup_sqlite', {
      p_backup: payload
    });
    throwSupabaseError(error);
    if (!data) throw new Error('O Supabase não confirmou a migração.');

    const resultado = data as { totalLeads: number; totalInteracoes: number };
    console.log(`Migração concluída: ${resultado.totalLeads} leads e ${resultado.totalInteracoes} interações.`);
  }
} finally {
  db.close();
}
