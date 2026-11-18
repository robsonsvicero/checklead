import { getDb } from '../db/connection.js';
import { obterConfiguracao } from './configService.js';
import { Lead, Interacao, ExportData } from '@radar/shared';
import { getDatabaseProvider, getSupabaseClient, throwSupabaseError } from '../db/supabase.js';
import { listarInteracoes, listarLeads } from './leadService.js';

export function gerarModeloCsvVazio(): string {
  const colunas = [
    'Nome',
    'WhatsApp',
    'E-mail',
    'Contato',
    'Instagram',
    'Google Meu Negócio',
    'Responsável',
    'Serviço',
    'Valor Estimado (R$)',
    'Origem',
    'Status',
    'Motivo da Perda'
  ];

  // Gera o cabeçalho com BOM UTF-8 para compatibilidade perfeita com Excel no Windows
  return '\uFEFF' + colunas.join(';') + '\r\n';
}

export async function importarPlanilhaCsv(conteudoCsv: string, userId: string): Promise<{ totalImportados: number; totalIgnorados: number }> {
  const textoLimpo = conteudoCsv.replace(/^\uFEFF/, '').trim();
  if (!textoLimpo) {
    throw new Error('A planilha enviada está vazia.');
  }

  // Detecta se o separador predominante é ponto e vírgula ou vírgula
  const primeiraLinha = textoLimpo.split(/\r?\n/)[0] || '';
  const separador = primeiraLinha.split(';').length >= primeiraLinha.split(',').length ? ';' : ',';

  const linhas = parseLinhasCsv(textoLimpo, separador);
  if (linhas.length < 2) {
    throw new Error('A planilha precisa conter o cabeçalho e pelo menos uma linha de lead.');
  }

  const cabecalho = linhas[0].map(c => normalizarChave(c));

  const idxNome = cabecalho.findIndex(c => c.includes('nome'));
  const idxWhatsApp = cabecalho.findIndex(c => c.includes('whats') || c.includes('zap') || c.includes('celular') || c.includes('telefone'));
  const idxEmail = cabecalho.findIndex(c => c.includes('mail'));
  const idxInstagram = cabecalho.findIndex(c => c.includes('instagram'));
  const idxGoogleMeuNegocio = cabecalho.findIndex(c => c.includes('google') && c.includes('negocio'));
  const idxContatoGenerico = cabecalho.findIndex(c => c.includes('contato'));
  const idxResponsavel = cabecalho.findIndex(c => c.includes('responsavel') || c.includes('responsável') || c.includes('atendente') || c.includes('dono'));
  const idxServico = cabecalho.findIndex(c => c.includes('servico') || c.includes('serviço'));
  const idxValor = cabecalho.findIndex(c => c.includes('valor'));
  const idxOrigem = cabecalho.findIndex(c => c.includes('origem') || c.includes('canal'));
  const idxStatus = cabecalho.findIndex(c => c.includes('status'));
  const idxMotivo = cabecalho.findIndex(c => c.includes('motivo'));

  if (idxNome === -1 || (idxWhatsApp === -1 && idxEmail === -1 && idxContatoGenerico === -1)) {
    throw new Error('A planilha deve conter pelo menos a coluna "Nome" e uma coluna de contato ("WhatsApp" ou "E-mail"). Baixe a planilha modelo para conferir o padrão.');
  }

  const agora = new Date().toISOString();
  let totalIgnorados = 0;
  const leadsImportados: Array<Record<string, string | number | null>> = [];

  for (let i = 1; i < linhas.length; i++) {
    const col = linhas[i];
    const nome = col[idxNome]?.trim();
    const whatsapp = idxWhatsApp !== -1 && col[idxWhatsApp]?.trim() ? col[idxWhatsApp].trim() : null;
    const email = idxEmail !== -1 && col[idxEmail]?.trim() ? col[idxEmail].trim() : null;
    const instagram = idxInstagram !== -1 && col[idxInstagram]?.trim()
      ? col[idxInstagram].trim().replace(/^@/, '')
      : null;
    const googleMeuNegocio = idxGoogleMeuNegocio !== -1 && col[idxGoogleMeuNegocio]?.trim()
      ? col[idxGoogleMeuNegocio].trim()
      : null;
    const contatoGen = idxContatoGenerico !== -1 && col[idxContatoGenerico]?.trim() ? col[idxContatoGenerico].trim() : null;
    const responsavel = idxResponsavel !== -1 && col[idxResponsavel]?.trim() ? col[idxResponsavel].trim() : null;

    const contato = whatsapp || email || contatoGen;

    if (!nome || !contato) {
      totalIgnorados++;
      continue;
    }

    const servico = idxServico !== -1 && col[idxServico]?.trim() ? col[idxServico].trim() : 'Não especificado';
    const valorBruto = idxValor !== -1 && col[idxValor] ? col[idxValor] : '0';
    const valorCentavos = parseValorMoeda(valorBruto);

    let origem = 'outro';
    if (idxOrigem !== -1 && col[idxOrigem]) {
      const o = col[idxOrigem].trim().toLowerCase();
      if (o.includes('insta')) origem = 'Instagram';
      else if (o.includes('indica') || o.includes('indicação')) origem = 'indicação';
      else if (o.includes('site') || o.includes('scraper')  || o.includes('web')) origem = 'site';
    }

    let status = 'novo';
    if (idxStatus !== -1 && col[idxStatus]) {
      const s = col[idxStatus].trim().toLowerCase();
      if (s.includes('orcamento') || s.includes('orçado')) status = 'orcamento_enviado';
      else if (s.includes('fecha') || s.includes('ganho')) status = 'fechado';
      else if (s.includes('perde') || s.includes('perdido')) status = 'perdido';
      else if (s.includes('standby') || s.includes('espera') || s.includes('pausa')) status = 'standby';
    }

    const motivoPerda = idxMotivo !== -1 && col[idxMotivo]?.trim() ? col[idxMotivo].trim() : (status === 'perdido' ? 'Não informado' : null);

    const orcamentoEm = status === 'orcamento_enviado' ? agora : null;
    const fechadoEm = (status === 'fechado' || status === 'perdido') ? agora : null;

    leadsImportados.push({
      nome,
      contato,
      whatsapp,
      email,
      instagram,
      google_meu_negocio: googleMeuNegocio,
      site: null,
      responsavel,
      servico,
      origem,
      valor_estimado: valorCentavos,
      status,
      criado_em: agora,
      ultimo_contato_em: null,
      orcamento_enviado_em: orcamentoEm,
      fechado_em: fechadoEm,
      motivo_perda: motivoPerda,
      proxima_acao_em: null
    });
  }

  if (getDatabaseProvider() === 'supabase') {
    const { data, error } = await getSupabaseClient().rpc('importar_leads_em_lote', {
      p_user_id: userId,
      p_leads: leadsImportados
    });
    throwSupabaseError(error);
    const resultado = data as { totalImportados: number; totalIgnorados: number };
    return { totalImportados: resultado.totalImportados, totalIgnorados };
  }

  const db = getDb();
  db.exec('BEGIN TRANSACTION;');
  try {
    const stmtLead = db.prepare(`
      INSERT INTO leads (
        nome, contato, whatsapp, email, instagram, google_meu_negocio, site, responsavel, servico, origem, valor_estimado, status, criado_em,
        ultimo_contato_em, orcamento_enviado_em, fechado_em, motivo_perda, proxima_acao_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stmtIt = db.prepare(`
      INSERT INTO interacoes (lead_id, tipo, texto, criado_em)
      VALUES (?, 'nota', ?, ?)
    `);

    for (const lead of leadsImportados) {
      const res = stmtLead.run(
        lead.nome,
        lead.contato,
        lead.whatsapp,
        lead.email,
        lead.instagram,
        lead.google_meu_negocio,
        lead.site || null,
        lead.responsavel,
        lead.servico,
        lead.origem,
        lead.valor_estimado,
        lead.status,
        lead.criado_em,
        lead.ultimo_contato_em,
        lead.orcamento_enviado_em,
        lead.fechado_em,
        lead.motivo_perda,
        lead.proxima_acao_em
      );
      stmtIt.run(
        Number(res.lastInsertRowid),
        `Lead importado via planilha CSV. Origem: ${lead.origem}. Responsável: ${lead.responsavel || 'Não informado'}.`,
        agora
      );
    }

    db.exec('COMMIT;');
    return { totalImportados: leadsImportados.length, totalIgnorados };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

function normalizarChave(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function parseValorMoeda(val: string): number {
  if (!val) return 0;
  const limpo = val.replace(/[^\d.,]/g, '').trim();
  if (!limpo) return 0;

  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const num = parseFloat(normalizado);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

function parseLinhasCsv(texto: string, sep: string): string[][] {
  const linhas: string[][] = [];
  let linhaAtual: string[] = [];
  let campoAtual = '';
  let dentroAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const proximo = texto[i + 1];

    if (char === '"') {
      if (dentroAspas && proximo === '"') {
        campoAtual += '"';
        i++; // pula aspas escapadas
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (char === sep && !dentroAspas) {
      linhaAtual.push(campoAtual.trim());
      campoAtual = '';
    } else if ((char === '\r' || char === '\n') && !dentroAspas) {
      if (char === '\r' && proximo === '\n') {
        i++;
      }
      linhaAtual.push(campoAtual.trim());
      if (linhaAtual.some(c => c !== '')) {
        linhas.push(linhaAtual);
      }
      linhaAtual = [];
      campoAtual = '';
    } else {
      campoAtual += char;
    }
  }

  if (campoAtual || linhaAtual.length > 0) {
    linhaAtual.push(campoAtual.trim());
    if (linhaAtual.some(c => c !== '')) {
      linhas.push(linhaAtual);
    }
  }

  return linhas;
}

export async function gerarExportacaoJson(userId: string): Promise<ExportData> {
  let configuracao: Awaited<ReturnType<typeof obterConfiguracao>>;
  let leads: Lead[];
  let interacoes: Interacao[];

  if (getDatabaseProvider() === 'supabase') {
    [configuracao, leads, interacoes] = await Promise.all([
      obterConfiguracao(userId),
      listarLeads({ ordenarPor: 'data', ordem: 'asc' }, userId),
      listarInteracoes(userId)
    ]);
  } else {
    const db = getDb();
    [configuracao, leads, interacoes] = await Promise.all([
      obterConfiguracao(userId),
      Promise.resolve(db.prepare('SELECT * FROM leads ORDER BY id ASC').all() as unknown as Lead[]),
      Promise.resolve(db.prepare('SELECT * FROM interacoes ORDER BY id ASC').all() as unknown as Interacao[])
    ]);
  }

  return {
    versao: '1.0.0',
    gerado_em: new Date().toISOString(),
    configuracao,
    leads,
    interacoes
  };
}

export async function gerarExportacaoCsv(userId: string): Promise<string> {
  const leads = getDatabaseProvider() === 'supabase'
    ? await listarLeads({ ordenarPor: 'data', ordem: 'asc' }, userId)
    : getDb().prepare('SELECT * FROM leads ORDER BY id ASC').all() as unknown as Lead[];

  const colunas = [
    'ID',
    'Nome',
    'WhatsApp',
    'E-mail',
    'Instagram',
    'Google Meu Negócio',
    'Responsável',
    'Contato',
    'Serviço',
    'Origem',
    'Valor Estimado (R$)',
    'Status',
    'Criado Em',
    'Último Contato Em',
    'Orçamento Enviado Em',
    'Fechado Em',
    'Motivo da Perda',
    'Próxima Ação Em'
  ];

  const linhas = [colunas.join(';')];

  for (const lead of leads) {
    const valorFormatado = (lead.valor_estimado / 100).toFixed(2).replace('.', ',');
    const linha = [
      lead.id,
      escapeCsv(lead.nome),
      escapeCsv(lead.whatsapp || ''),
      escapeCsv(lead.email || ''),
      escapeCsv(lead.instagram ? `@${lead.instagram.replace(/^@/, '')}` : ''),
      escapeCsv(lead.google_meu_negocio || ''),
      escapeCsv(lead.responsavel || ''),
      escapeCsv(lead.contato),
      escapeCsv(lead.servico),
      escapeCsv(lead.origem),
      valorFormatado,
      escapeCsv(lead.status),
      lead.criado_em || '',
      lead.ultimo_contato_em || '',
      lead.orcamento_enviado_em || '',
      lead.fechado_em || '',
      escapeCsv(lead.motivo_perda || ''),
      lead.proxima_acao_em || ''
    ];
    linhas.push(linha.join(';'));
  }

  return '\uFEFF' + linhas.join('\r\n'); // BOM para Excel abrir acentos UTF-8 perfeitamente
}

function escapeCsv(valor: string | number): string {
  const str = String(valor ?? '');
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function importarBackupJson(conteudo: unknown, userId: string): Promise<{ totalLeads: number; totalInteracoes: number }> {
  if (typeof conteudo !== 'object' || conteudo === null) {
    throw new Error('Formato de JSON inválido');
  }

  const data = conteudo as Partial<ExportData>;
  if (!Array.isArray(data.leads)) {
    throw new Error('Arquivo de backup inválido: lista de leads ausente.');
  }

  if (getDatabaseProvider() === 'supabase') {
    const { data: resultado, error } = await getSupabaseClient().rpc('restaurar_backup', {
      p_user_id: userId,
      p_backup: data
    });
    throwSupabaseError(error);
    if (!resultado) throw new Error('O Supabase não retornou o resultado da restauração.');
    return resultado as { totalLeads: number; totalInteracoes: number };
  }

  const db = getDb();

  // Executa toda a importação dentro de transação SQLite
  db.exec('BEGIN TRANSACTION;');
  try {
    // Limpa dados anteriores
    db.exec('DELETE FROM interacoes;');
    db.exec('DELETE FROM leads;');

    // Restaura configurações se existirem
    if (data.configuracao) {
      db.prepare(`
        UPDATE configuracoes 
        SET limite_sem_resposta_horas = ?,
            limite_follow_up_dias = ?,
            limite_lead_parado_dias = ?,
            atualizado_em = ?
        WHERE id = 1
      `).run(
        data.configuracao.limite_sem_resposta_horas || 24,
        data.configuracao.limite_follow_up_dias || 3,
        data.configuracao.limite_lead_parado_dias || 7,
        new Date().toISOString()
      );
    }

    // Insere Leads
    const stmtLead = db.prepare(`
      INSERT INTO leads (
        id, nome, contato, whatsapp, email, instagram, google_meu_negocio, site, responsavel, servico, origem, valor_estimado, status,
        criado_em, ultimo_contato_em, orcamento_enviado_em, fechado_em, motivo_perda, proxima_acao_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const lead of data.leads) {
      stmtLead.run(
        lead.id,
        lead.nome,
        lead.contato,
        lead.whatsapp || null,
        lead.email || null,
        lead.instagram?.replace(/^@/, '') || null,
        lead.google_meu_negocio || null,
        lead.site || null,
        lead.responsavel || null,
        lead.servico,
        lead.origem,
        lead.valor_estimado || 0,
        lead.status || 'novo',
        lead.criado_em,
        lead.ultimo_contato_em || null,
        lead.orcamento_enviado_em || null,
        lead.fechado_em || null,
        lead.motivo_perda || null,
        lead.proxima_acao_em || null
      );
    }

    // Insere Interações se presentes
    let totalInteracoes = 0;
    if (Array.isArray(data.interacoes)) {
      const stmtIt = db.prepare(`
        INSERT INTO interacoes (id, lead_id, tipo, texto, criado_em)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const it of data.interacoes) {
        stmtIt.run(it.id, it.lead_id, it.tipo, it.texto, it.criado_em);
        totalInteracoes++;
      }
    }

    db.exec('COMMIT;');
    return {
      totalLeads: data.leads.length,
      totalInteracoes
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}
