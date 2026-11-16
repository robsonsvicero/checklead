import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb, setDb } from '../db/connection.js';
import { runMigrations } from '../db/migrations.js';
import { DatabaseSync } from 'node:sqlite';
import { gerarExportacaoCsv, gerarModeloCsvVazio, importarPlanilhaCsv } from '../services/backupService.js';
import { Lead } from '@radar/shared';

describe('CSV Template and Import', () => {
  beforeEach(() => {
    const memoryDb = new DatabaseSync(':memory:');
    runMigrations(memoryDb);
    setDb(memoryDb);
  });

  afterEach(() => {
    closeDb();
  });

  it('deve gerar planilha modelo vazia com os cabeçalhos padrão incluindo WhatsApp, E-mail e Responsável', () => {
    const csv = gerarModeloCsvVazio();
    expect(csv).toContain('Nome');
    expect(csv).toContain('WhatsApp');
    expect(csv).toContain('E-mail');
    expect(csv).toContain('Contato');
    expect(csv).toContain('Instagram');
    expect(csv).toContain('Google Meu Negócio');
    expect(csv).toContain('Responsável');
    expect(csv).toContain('Serviço');
    expect(csv).toContain('Valor Estimado (R$)');
    expect(csv).toContain('Origem');
    expect(csv).toContain('Status');
    expect(csv).toContain('Motivo da Perda');
  });

  it('deve importar e exportar os links sociais de cada lead', async () => {
    const csv = `Nome;WhatsApp;E-mail;Responsável;Instagram;Google Meu Negócio;Serviço;Valor Estimado (R$);Origem;Status;Motivo da Perda
Carlos Silva;11988887777;carlos@email.com;Mariana;@carlos.silva;https://maps.app.goo.gl/carlos;Reforma de Banheiro;2.500,00;Instagram;novo;
Ana Costa;;ana@empresa.com;Robson;;;Consultoria;1500;indicação;orcamento_enviado;
`;

    const res = await importarPlanilhaCsv(csv, 'local-owner');
    expect(res.totalImportados).toBe(2);
    expect(res.totalIgnorados).toBe(0);

    const db = getDb();
    const leads = db.prepare('SELECT * FROM leads ORDER BY id ASC').all() as unknown as Lead[];
    expect(leads.length).toBe(2);
    expect(leads[0].nome).toBe('Carlos Silva');
    expect(leads[0].whatsapp).toBe('11988887777');
    expect(leads[0].email).toBe('carlos@email.com');
    expect(leads[0].responsavel).toBe('Mariana');
    expect(leads[0].instagram).toBe('carlos.silva');
    expect(leads[0].google_meu_negocio).toBe('https://maps.app.goo.gl/carlos');
    expect(leads[0].valor_estimado).toBe(250000); // R$ 2.500,00 em centavos
    expect(leads[0].origem).toBe('Instagram');
    expect(leads[0].status).toBe('novo');

    expect(leads[1].nome).toBe('Ana Costa');
    expect(leads[1].whatsapp).toBeNull();
    expect(leads[1].email).toBe('ana@empresa.com');
    expect(leads[1].responsavel).toBe('Robson');
    expect(leads[1].instagram).toBeNull();
    expect(leads[1].google_meu_negocio).toBeNull();
    expect(leads[1].valor_estimado).toBe(150000);
    expect(leads[1].status).toBe('orcamento_enviado');

    const exportacao = await gerarExportacaoCsv('local-owner');
    expect(exportacao).toContain('Instagram');
    expect(exportacao).toContain('Google Meu Negócio');
    expect(exportacao).toContain('@carlos.silva');
    expect(exportacao).toContain('https://maps.app.goo.gl/carlos');
  });

  it('deve ignorar linhas sem nome ou contato', async () => {
    const csv = `Nome,Contato,Serviço,Valor Estimado (R$),Origem
João Souza,11999991111,Site,500,site
,,Serviço sem cliente,100,outro
`;

    const res = await importarPlanilhaCsv(csv, 'local-owner');
    expect(res.totalImportados).toBe(1);
    expect(res.totalIgnorados).toBe(1);
  });
});
