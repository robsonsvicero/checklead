import { getDb } from '../db/connection.js';
import {
  Lead,
  Interacao,
  LeadComInteracoes,
  CriarLeadDTO,
  AtualizarLeadDTO,
  AcaoLeadDTO
} from '@radar/shared';

export interface ListLeadsFilter {
  status?: string;
  origem?: string;
  busca?: string;
  ordenarPor?: 'data' | 'valor';
  ordem?: 'asc' | 'desc';
}

export function listarLeads(filtros: ListLeadsFilter = {}): Lead[] {
  const db = getDb();
  const whereClauses: string[] = [];
  const params: (string | number | bigint | null)[] = [];

  if (filtros.status && filtros.status !== 'todos') {
    whereClauses.push('status = ?');
    params.push(filtros.status);
  }

  if (filtros.origem && filtros.origem !== 'todos') {
    whereClauses.push('origem = ?');
    params.push(filtros.origem);
  }

  if (filtros.busca && filtros.busca.trim() !== '') {
    whereClauses.push('(nome LIKE ? OR contato LIKE ? OR whatsapp LIKE ? OR email LIKE ? OR responsavel LIKE ? OR servico LIKE ?)');
    const termo = `%${filtros.busca.trim()}%`;
    params.push(termo, termo, termo, termo, termo, termo);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  const ordemCampo = filtros.ordenarPor === 'valor' ? 'valor_estimado' : 'criado_em';
  const direcao = filtros.ordem === 'asc' ? 'ASC' : 'DESC';

  const sql = `SELECT * FROM leads ${whereSql} ORDER BY ${ordemCampo} ${direcao}`;
  return db.prepare(sql).all(...params) as unknown as Lead[];
}

export function obterLeadPorId(id: number): LeadComInteracoes | null {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as unknown as Lead | undefined;
  if (!lead) return null;

  const interacoes = db.prepare('SELECT * FROM interacoes WHERE lead_id = ? ORDER BY criado_em DESC').all(id) as unknown as Interacao[];

  return {
    ...lead,
    interacoes
  };
}

export function criarLead(dados: CriarLeadDTO): Lead {
  const db = getDb();
  const agora = new Date().toISOString();

  const whatsapp = dados.whatsapp?.trim() || null;
  const email = dados.email?.trim() || null;
  const contato = dados.contato?.trim() || whatsapp || email || 'Sem contato';
  const responsavel = dados.responsavel?.trim() || null;

  const res = db.prepare(`
    INSERT INTO leads (
      nome, contato, whatsapp, email, responsavel, servico, origem, valor_estimado, status, criado_em,
      ultimo_contato_em, orcamento_enviado_em, fechado_em, motivo_perda, proxima_acao_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'novo', ?, NULL, NULL, NULL, NULL, ?)
  `).run(
    dados.nome.trim(),
    contato,
    whatsapp,
    email,
    responsavel,
    dados.servico.trim(),
    dados.origem,
    dados.valor_estimado,
    agora,
    dados.proxima_acao_em || null
  );

  const novoId = Number(res.lastInsertRowid);

  // Cria interação inicial de entrada do lead
  db.prepare(`
    INSERT INTO interacoes (lead_id, tipo, texto, criado_em)
    VALUES (?, 'nota', ?, ?)
  `).run(novoId, `Lead criado no Radar via ${dados.origem}. Responsável: ${responsavel || 'Não definido'}. Serviço: ${dados.servico}.`, agora);

  return db.prepare('SELECT * FROM leads WHERE id = ?').get(novoId) as unknown as Lead;
}

export function atualizarLead(id: number, dados: AtualizarLeadDTO): Lead {
  const db = getDb();
  const leadAtual = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as unknown as Lead | undefined;
  if (!leadAtual) {
    throw new Error('Lead não encontrado');
  }

  const updates: string[] = [];
  const params: (string | number | bigint | null)[] = [];

  if (dados.nome !== undefined) {
    updates.push('nome = ?');
    params.push(dados.nome.trim());
  }
  if (dados.whatsapp !== undefined) {
    updates.push('whatsapp = ?');
    params.push(dados.whatsapp ? dados.whatsapp.trim() : null);
  }
  if (dados.email !== undefined) {
    updates.push('email = ?');
    params.push(dados.email ? dados.email.trim() : null);
  }
  if (dados.responsavel !== undefined) {
    updates.push('responsavel = ?');
    params.push(dados.responsavel ? dados.responsavel.trim() : null);
  }
  if (dados.contato !== undefined) {
    updates.push('contato = ?');
    params.push(dados.contato.trim());
  } else if (dados.whatsapp !== undefined || dados.email !== undefined) {
    const w = dados.whatsapp !== undefined ? dados.whatsapp?.trim() : leadAtual.whatsapp;
    const e = dados.email !== undefined ? dados.email?.trim() : leadAtual.email;
    updates.push('contato = ?');
    params.push(w || e || leadAtual.contato);
  }
  if (dados.servico !== undefined) {
    updates.push('servico = ?');
    params.push(dados.servico.trim());
  }
  if (dados.origem !== undefined) {
    updates.push('origem = ?');
    params.push(dados.origem);
  }
  if (dados.valor_estimado !== undefined) {
    updates.push('valor_estimado = ?');
    params.push(dados.valor_estimado);
  }
  if (dados.status !== undefined) {
    updates.push('status = ?');
    params.push(dados.status);
    if (dados.status === 'fechado' || dados.status === 'perdido') {
      updates.push('fechado_em = ?');
      params.push(new Date().toISOString());
    }
  }
  if (dados.motivo_perda !== undefined) {
    updates.push('motivo_perda = ?');
    params.push(dados.motivo_perda);
  }
  if (dados.proxima_acao_em !== undefined) {
    updates.push('proxima_acao_em = ?');
    params.push(dados.proxima_acao_em);
  }

  if (updates.length > 0) {
    params.push(id);
    db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  return db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as unknown as Lead;
}

export function executarAcaoLead(id: number, acao: AcaoLeadDTO): LeadComInteracoes {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as unknown as Lead | undefined;
  if (!lead) {
    throw new Error('Lead não encontrado');
  }

  const agora = new Date().toISOString();

  switch (acao.tipo) {
    case 'contato': {
      db.prepare(`
        UPDATE leads 
        SET ultimo_contato_em = ?
        WHERE id = ?
      `).run(agora, id);

      db.prepare(`
        INSERT INTO interacoes (lead_id, tipo, texto, criado_em)
        VALUES (?, 'contato', ?, ?)
      `).run(id, acao.texto || 'Contato realizado com o cliente.', agora);
      break;
    }

    case 'orcamento': {
      db.prepare(`
        UPDATE leads 
        SET status = 'orcamento_enviado',
            orcamento_enviado_em = ?,
            ultimo_contato_em = ?
        WHERE id = ?
      `).run(agora, agora, id);

      db.prepare(`
        INSERT INTO interacoes (lead_id, tipo, texto, criado_em)
        VALUES (?, 'orcamento', ?, ?)
      `).run(id, acao.texto || 'Orçamento enviado com sucesso.', agora);
      break;
    }

    case 'follow_up': {
      db.prepare(`
        UPDATE leads 
        SET ultimo_contato_em = ?
        WHERE id = ?
      `).run(agora, id);

      db.prepare(`
        INSERT INTO interacoes (lead_id, tipo, texto, criado_em)
        VALUES (?, 'follow_up', ?, ?)
      `).run(id, acao.texto || 'Follow-up de cobrança ou acompanhamento realizado.', agora);
      break;
    }

    case 'fechou': {
      db.prepare(`
        UPDATE leads 
        SET status = 'fechado',
            fechado_em = ?,
            ultimo_contato_em = ?
        WHERE id = ?
      `).run(agora, agora, id);

      db.prepare(`
        INSERT INTO interacoes (lead_id, tipo, texto, criado_em)
        VALUES (?, 'contato', ?, ?)
      `).run(id, acao.texto || 'Venda concluída! Lead marcado como fechado.', agora);
      break;
    }

    case 'perdeu': {
      db.prepare(`
        UPDATE leads 
        SET status = 'perdido',
            fechado_em = ?,
            motivo_perda = ?
        WHERE id = ?
      `).run(agora, acao.motivo_perda, id);

      db.prepare(`
        INSERT INTO interacoes (lead_id, tipo, texto, criado_em)
        VALUES (?, 'nota', ?, ?)
      `).run(id, acao.texto || `Venda perdida. Motivo: ${acao.motivo_perda}`, agora);
      break;
    }

    case 'nota': {
      db.prepare(`
        INSERT INTO interacoes (lead_id, tipo, texto, criado_em)
        VALUES (?, 'nota', ?, ?)
      `).run(id, acao.texto, agora);
      break;
    }
  }

  return obterLeadPorId(id)!;
}

export function excluirLead(id: number): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  return Number(res.changes) > 0;
}
