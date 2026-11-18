import { getDb } from '../db/connection.js';
import {
  Lead,
  Interacao,
  LeadComInteracoes,
  CriarLeadDTO,
  AtualizarLeadDTO,
  AcaoLeadDTO
} from '@radar/shared';
import { getDatabaseProvider, getSupabaseClient, throwSupabaseError } from '../db/supabase.js';

export interface ListLeadsFilter {
  status?: string;
  origem?: string;
  busca?: string;
  ordenarPor?: 'data' | 'valor' | 'nome';
  ordem?: 'asc' | 'desc';
}

export async function listarInteracoes(userId: string): Promise<Interacao[]> {
  if (getDatabaseProvider() === 'supabase') {
    const { data, error } = await getSupabaseClient()
      .from('interacoes')
      .select('*')
      .eq('user_id', userId)
      .order('criado_em', { ascending: true })
      .order('id', { ascending: true });
    throwSupabaseError(error);
    return (data || []).map((interacao: Interacao) => normalizarInteracao(interacao));
  }

  return getDb()
    .prepare('SELECT * FROM interacoes ORDER BY criado_em ASC')
    .all() as unknown as Interacao[];
}

export async function listarLeads(filtros: ListLeadsFilter, userId: string): Promise<Lead[]> {
  if (getDatabaseProvider() === 'supabase') {
    const { data, error } = await getSupabaseClient()
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true });
    throwSupabaseError(error);

    let leads = (data || []).map((lead: Lead) => normalizarLead(lead));
    if (filtros.status && filtros.status !== 'todos') {
      leads = leads.filter(lead => lead.status === filtros.status);
    }
    if (filtros.origem && filtros.origem !== 'todos') {
      leads = leads.filter(lead => lead.origem === filtros.origem);
    }
    if (filtros.busca?.trim()) {
      const termo = filtros.busca.trim().toLocaleLowerCase('pt-BR');
      leads = leads.filter(lead =>
        [lead.nome, lead.contato, lead.whatsapp, lead.email, lead.responsavel, lead.servico]
          .some(valor => valor?.toLocaleLowerCase('pt-BR').includes(termo))
      );
    }

    const comparar = filtros.ordenarPor === 'valor'
      ? (a: Lead, b: Lead) => a.valor_estimado - b.valor_estimado
      : filtros.ordenarPor === 'nome'
        ? compararNomes
        : (a: Lead, b: Lead) => a.criado_em.localeCompare(b.criado_em);
    const direcao = filtros.ordem === 'asc' ? 1 : -1;
    return leads.sort((a, b) => comparar(a, b) * direcao);
  }

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
  const leads = db.prepare(sql).all(...params) as unknown as Lead[];
  if (filtros.ordenarPor === 'nome') {
    const direcaoNome = filtros.ordem === 'asc' ? 1 : -1;
    return leads.sort((a, b) => compararNomes(a, b) * direcaoNome);
  }
  return leads;
}

export async function obterLeadPorId(id: number, userId: string): Promise<LeadComInteracoes | null> {
  if (getDatabaseProvider() === 'supabase') {
    const client = getSupabaseClient();
    const [{ data: lead, error: leadError }, { data: interacoes, error: interacoesError }] = await Promise.all([
      client.from('leads').select('*').eq('id', id).eq('user_id', userId).maybeSingle(),
      client.from('interacoes').select('*').eq('lead_id', id).eq('user_id', userId).order('criado_em', { ascending: false })
    ]);
    throwSupabaseError(leadError);
    throwSupabaseError(interacoesError);
    if (!lead) return null;

    return {
      ...normalizarLead(lead as Lead),
      interacoes: (interacoes || []).map((interacao: Interacao) => normalizarInteracao(interacao))
    };
  }

  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as unknown as Lead | undefined;
  if (!lead) return null;

  const interacoes = db.prepare('SELECT * FROM interacoes WHERE lead_id = ? ORDER BY criado_em DESC').all(id) as unknown as Interacao[];

  return {
    ...lead,
    interacoes
  };
}

export async function criarLead(dados: CriarLeadDTO, userId: string): Promise<Lead> {
  if (getDatabaseProvider() === 'supabase') {
    const whatsapp = dados.whatsapp?.trim() || null;
    const email = dados.email?.trim() || null;
    const instagram = dados.instagram?.trim().replace(/^@/, '') || null;
    const googleMeuNegocio = dados.google_meu_negocio?.trim() || null;
    const responsavel = dados.responsavel?.trim() || null;
    const { data, error } = await getSupabaseClient().rpc('criar_lead_atomic', {
      p_user_id: userId,
      p_lead: {
        nome: dados.nome.trim(),
        contato: dados.contato?.trim() || whatsapp || email || 'Sem contato',
        whatsapp,
        email,
        instagram,
        google_meu_negocio: googleMeuNegocio,
        responsavel,
        servico: dados.servico.trim(),
        origem: dados.origem,
        valor_estimado: dados.valor_estimado,
        proxima_acao_em: dados.proxima_acao_em || null
      }
    });
    throwSupabaseError(error);
    return normalizarLead(data as Lead);
  }

  const db = getDb();
  const agora = new Date().toISOString();

  const whatsapp = dados.whatsapp?.trim() || null;
  const email = dados.email?.trim() || null;
  const instagram = dados.instagram?.trim().replace(/^@/, '') || null;
  const googleMeuNegocio = dados.google_meu_negocio?.trim() || null;
  const contato = dados.contato?.trim() || whatsapp || email || 'Sem contato';
  const responsavel = dados.responsavel?.trim() || null;

  const res = db.prepare(`
    INSERT INTO leads (
      nome, contato, whatsapp, email, instagram, google_meu_negocio, responsavel, servico, origem, valor_estimado, status, criado_em,
      ultimo_contato_em, orcamento_enviado_em, fechado_em, motivo_perda, proxima_acao_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'novo', ?, NULL, NULL, NULL, NULL, ?)
  `).run(
    dados.nome.trim(),
    contato,
    whatsapp,
    email,
    instagram,
    googleMeuNegocio,
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

export async function atualizarLead(id: number, dados: AtualizarLeadDTO, userId: string): Promise<Lead> {
  if (getDatabaseProvider() === 'supabase') {
    const client = getSupabaseClient();
    const { data: leadAtual, error: selectError } = await client
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    throwSupabaseError(selectError);
    if (!leadAtual) throw new Error('Lead não encontrado');

    const atualizacoes: AtualizarLeadDTO = { ...dados };
    if (dados.whatsapp !== undefined || dados.email !== undefined) {
      const whatsapp = dados.whatsapp !== undefined ? dados.whatsapp?.trim() : leadAtual.whatsapp;
      const email = dados.email !== undefined ? dados.email?.trim() : leadAtual.email;
      atualizacoes.contato = dados.contato?.trim() || whatsapp || email || leadAtual.contato;
    }

    const { data, error } = await client
      .from('leads')
      .update(atualizacoes)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    throwSupabaseError(error);
    if (!data) throw new Error('Lead não encontrado');
    return normalizarLead(data as Lead);
  }

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
  if (dados.instagram !== undefined) {
    updates.push('instagram = ?');
    params.push(dados.instagram ? dados.instagram.trim().replace(/^@/, '') : null);
  }
  if (dados.google_meu_negocio !== undefined) {
    updates.push('google_meu_negocio = ?');
    params.push(dados.google_meu_negocio ? dados.google_meu_negocio.trim() : null);
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

export async function executarAcaoLead(id: number, acao: AcaoLeadDTO, userId: string): Promise<LeadComInteracoes> {
  if (getDatabaseProvider() === 'supabase') {
    const { data, error } = await getSupabaseClient().rpc('executar_acao_lead', {
      p_user_id: userId,
      p_id: id,
      p_acao: acao
    });
    throwSupabaseError(error);

    const resultado = data as { lead: Lead; interacoes: Interacao[] } | null;
    if (!resultado) throw new Error('O Supabase não retornou o lead atualizado');
    return {
      ...normalizarLead(resultado.lead),
      interacoes: resultado.interacoes.map(normalizarInteracao)
    };
  }

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

    case 'standby': {
      db.prepare(`
        UPDATE leads 
        SET status = 'standby'
        WHERE id = ?
      `).run(id);

      db.prepare(`
        INSERT INTO interacoes (lead_id, tipo, texto, criado_em)
        VALUES (?, 'nota', ?, ?)
      `).run(id, acao.texto || 'Lead colocado em Standby. Prazos pausados no Radar.', agora);
      break;
    }

    case 'reativar': {
      const statusReativado = lead.orcamento_enviado_em ? 'orcamento_enviado' : 'novo';
      db.prepare(`
        UPDATE leads 
        SET status = ?,
            ultimo_contato_em = ?
        WHERE id = ?
      `).run(statusReativado, agora, id);

      db.prepare(`
        INSERT INTO interacoes (lead_id, tipo, texto, criado_em)
        VALUES (?, 'nota', ?, ?)
      `).run(id, acao.texto || 'Lead reativado. Prazos voltam a ser monitorados no Radar.', agora);
      break;
    }
  }

  const leadAtualizado = await obterLeadPorId(id, userId);
  if (!leadAtualizado) throw new Error('Lead não encontrado');
  return leadAtualizado;
}

export async function excluirLead(id: number, userId: string): Promise<boolean> {
  if (getDatabaseProvider() === 'supabase') {
    const { data, error } = await getSupabaseClient()
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');
    throwSupabaseError(error);
    return (data || []).length > 0;
  }

  const db = getDb();
  const res = db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  return Number(res.changes) > 0;
}

function normalizarLead(lead: Lead & { user_id?: string }): Lead {
  const { user_id: _userId, ...dadosLead } = lead;
  return {
    ...dadosLead,
    id: Number(lead.id),
    valor_estimado: Number(lead.valor_estimado)
  };
}

function normalizarInteracao(interacao: Interacao & { user_id?: string }): Interacao {
  const { user_id: _userId, ...dadosInteracao } = interacao;
  return {
    ...dadosInteracao,
    id: Number(interacao.id),
    lead_id: Number(interacao.lead_id)
  };
}

function compararNomes(a: Lead, b: Lead): number {
  return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base', numeric: true });
}
