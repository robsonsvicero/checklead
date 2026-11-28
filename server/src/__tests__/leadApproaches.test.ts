import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CriarLeadSchema } from '@radar/shared';
import { DatabaseSync } from 'node:sqlite';
import { closeDb, getDb, setDb } from '../db/connection.js';
import { runMigrations } from '../db/migrations.js';
import {
  atualizarAbordagemLead,
  criarAbordagemLead,
  criarLead,
  listarAbordagensLead
} from '../services/leadService.js';
import { gerarExportacaoJson, importarBackupJson } from '../services/backupService.js';

describe('lead approaches', () => {
  beforeEach(() => {
    const memoryDb = new DatabaseSync(':memory:');
    runMigrations(memoryDb);
    setDb(memoryDb);
  });

  afterEach(() => {
    closeDb();
  });

  it('starts with the decision-maker approach and saves editable sequence steps', async () => {
    const lead = await criarLead(CriarLeadSchema.parse({
      nome: 'Loja Exemplo',
      whatsapp: '11999990000',
      servico: 'Consultoria',
      origem: 'Instagram',
      valor_estimado: 0
    }), 'local-owner');

    const [inicial] = await listarAbordagensLead(lead.id, 'local-owner');
    expect(inicial).toMatchObject({
      numero: 0,
      titulo: 'Descobrir quem é o decisor',
      status: 'rascunho'
    });

    const criada = await criarAbordagemLead(lead.id, {
      titulo: 'Apresentar a solução',
      canal: 'whatsapp',
      mensagem: 'Olá, gostaria de conversar sobre o serviço.',
      resultado: '',
      status: 'enviada'
    }, 'local-owner');
    expect(criada.numero).toBe(1);

    const atualizada = await atualizarAbordagemLead(lead.id, inicial.id, {
      resultado: 'A pessoa responsável pela contratação é a gerente.',
      status: 'concluida'
    }, 'local-owner');
    expect(atualizada).toMatchObject({
      numero: 0,
      resultado: 'A pessoa responsável pela contratação é a gerente.',
      status: 'concluida'
    });

    expect((await listarAbordagensLead(lead.id, 'local-owner')).map(item => item.numero)).toEqual([0, 1]);
  });

  it('includes approach text when exporting and restoring a backup', async () => {
    const lead = await criarLead(CriarLeadSchema.parse({
      nome: 'Loja Exemplo',
      whatsapp: '11999990000',
      servico: 'Consultoria',
      origem: 'Instagram',
      valor_estimado: 0
    }), 'local-owner');
    const [inicial] = await listarAbordagensLead(lead.id, 'local-owner');
    await atualizarAbordagemLead(lead.id, inicial.id, {
      mensagem: 'Quem é a pessoa responsável por decidir sobre esse serviço?'
    }, 'local-owner');

    const backup = await gerarExportacaoJson('local-owner');
    await importarBackupJson(backup, 'local-owner');

    const [restaurada] = await listarAbordagensLead(lead.id, 'local-owner');
    expect(restaurada.mensagem).toBe('Quem é a pessoa responsável por decidir sobre esse serviço?');
  });
});
