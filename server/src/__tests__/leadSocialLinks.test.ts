import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CriarLeadSchema, AtualizarLeadSchema } from '@radar/shared';
import { DatabaseSync } from 'node:sqlite';
import { closeDb, getDb, setDb } from '../db/connection.js';
import { runMigrations } from '../db/migrations.js';
import { atualizarLead, criarLead } from '../services/leadService.js';
import { gerarExportacaoJson, importarBackupJson } from '../services/backupService.js';

describe('lead social links', () => {
  beforeEach(() => {
    const memoryDb = new DatabaseSync(':memory:');
    runMigrations(memoryDb);
    setDb(memoryDb);
  });

  afterEach(() => {
    closeDb();
  });

  it('saves and updates Instagram handles, Google Business links, and site per lead', async () => {
    const dados = CriarLeadSchema.parse({
      nome: 'Loja Exemplo',
      whatsapp: '11999990000',
      servico: 'Consultoria',
      origem: 'Instagram',
      valor_estimado: 0,
      instagram: '@loja.exemplo',
      google_meu_negocio: 'https://maps.app.goo.gl/example',
      site: 'lojaexemplo.com.br'
    });

    const lead = await criarLead(dados, 'local-owner');

    expect(lead.instagram).toBe('loja.exemplo');
    expect(lead.google_meu_negocio).toBe('https://maps.app.goo.gl/example');
    expect(lead.site).toBe('https://lojaexemplo.com.br');

    await atualizarLead(lead.id, AtualizarLeadSchema.parse({
      instagram: '@loja.atualizada',
      google_meu_negocio: 'https://maps.app.goo.gl/updated',
      site: 'https://novosite.com.br'
    }), 'local-owner');

    const atualizado = getDb().prepare('SELECT instagram, google_meu_negocio, site FROM leads WHERE id = ?').get(lead.id) as {
      instagram: string;
      google_meu_negocio: string;
      site: string;
    };
    expect(atualizado).toEqual({
      instagram: 'loja.atualizada',
      google_meu_negocio: 'https://maps.app.goo.gl/updated',
      site: 'https://novosite.com.br'
    });

    const backup = await gerarExportacaoJson('local-owner');
    await importarBackupJson(backup, 'local-owner');
    const leadRestaurado = getDb().prepare('SELECT instagram, google_meu_negocio, site FROM leads WHERE id = ?').get(lead.id) as {
      instagram: string;
      google_meu_negocio: string;
      site: string;
    };
    expect(leadRestaurado).toEqual(atualizado);
  });

  it('adds social link columns to existing SQLite databases', () => {
    const legacyDb = new DatabaseSync(':memory:');
    legacyDb.exec(`
      CREATE TABLE leads (
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
      )
    `);

    runMigrations(legacyDb);
    const columns = (legacyDb.prepare('PRAGMA table_info(leads)').all() as Array<{ name: string }>)
      .map(column => column.name);

    expect(columns).toContain('instagram');
    expect(columns).toContain('google_meu_negocio');
    legacyDb.close();
  });

  it('rejects non-web protocols for Google Business links', () => {
    expect(() => CriarLeadSchema.parse({
      nome: 'Loja Exemplo',
      whatsapp: '11999990000',
      servico: 'Consultoria',
      origem: 'Instagram',
      valor_estimado: 0,
      google_meu_negocio: 'javascript:alert(1)'
    })).toThrow();
  });
});
