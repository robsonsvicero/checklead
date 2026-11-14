import { DatabaseSync } from 'node:sqlite';

export function runMigrations(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      senha_hash TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      limite_sem_resposta_horas INTEGER NOT NULL DEFAULT 24,
      limite_follow_up_dias INTEGER NOT NULL DEFAULT 3,
      limite_lead_parado_dias INTEGER NOT NULL DEFAULT 7,
      atualizado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      contato TEXT NOT NULL,
      whatsapp TEXT,
      email TEXT,
      responsavel TEXT,
      servico TEXT NOT NULL,
      origem TEXT NOT NULL,
      valor_estimado INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'novo',
      criado_em TEXT NOT NULL,
      ultimo_contato_em TEXT,
      orcamento_enviado_em TEXT,
      fechado_em TEXT,
      motivo_perda TEXT,
      proxima_acao_em TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_criado_em ON leads(criado_em);
    CREATE INDEX IF NOT EXISTS idx_leads_nome ON leads(nome);

    CREATE TABLE IF NOT EXISTS interacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      texto TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_interacoes_lead_id ON interacoes(lead_id);
    CREATE INDEX IF NOT EXISTS idx_interacoes_criado_em ON interacoes(criado_em);
  `);

  // Migração transparente para bases existentes
  const colunas = db.prepare('PRAGMA table_info(leads)').all() as Array<{ name: string }>;
  const nomesColunas = colunas.map(c => c.name);

  if (!nomesColunas.includes('whatsapp')) {
    db.exec('ALTER TABLE leads ADD COLUMN whatsapp TEXT;');
  }
  if (!nomesColunas.includes('email')) {
    db.exec('ALTER TABLE leads ADD COLUMN email TEXT;');
  }
  if (!nomesColunas.includes('responsavel')) {
    db.exec('ALTER TABLE leads ADD COLUMN responsavel TEXT;');
  }

  // Garante que a linha de configuração padrão exista
  const conf = db.prepare('SELECT id FROM configuracoes WHERE id = 1').get();
  if (!conf) {
    db.prepare(`
      INSERT INTO configuracoes (id, limite_sem_resposta_horas, limite_follow_up_dias, limite_lead_parado_dias, atualizado_em)
      VALUES (1, 24, 3, 7, ?)
    `).run(new Date().toISOString());
  }
}
