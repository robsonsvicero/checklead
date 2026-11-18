import {
  Lead,
  Interacao,
  Configuracao,
  AlertaLead,
  MetricasRadar,
  MotivoPerdaItem
} from '@radar/shared';

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

export function calcularAlertas(
  leads: Lead[],
  interacoesPorLead: Map<number, Interacao[]>,
  config: Configuracao,
  agora: Date = new Date()
): AlertaLead[] {
  const agoraMs = agora.getTime();
  const alertas: AlertaLead[] = [];

  for (const lead of leads) {
    // Alertas são apenas para leads em aberto que não estejam em standby
    if (lead.status === 'fechado' || lead.status === 'perdido' || lead.status === 'standby') {
      continue;
    }

    const interacoes = interacoesPorLead.get(lead.id) || [];
    
    // Obter data da última interação ou última atividade
    let ultimaAtividadeMs = new Date(lead.criado_em).getTime();
    if (lead.ultimo_contato_em) {
      const contatoMs = new Date(lead.ultimo_contato_em).getTime();
      if (contatoMs > ultimaAtividadeMs) ultimaAtividadeMs = contatoMs;
    }
    if (lead.orcamento_enviado_em) {
      const orcMs = new Date(lead.orcamento_enviado_em).getTime();
      if (orcMs > ultimaAtividadeMs) ultimaAtividadeMs = orcMs;
    }
    for (const interacao of interacoes) {
      const itMs = new Date(interacao.criado_em).getTime();
      if (itMs > ultimaAtividadeMs) ultimaAtividadeMs = itMs;
    }

    const tempoDesdeUltimaAtividadeHoras = Math.max(0, Math.floor((agoraMs - ultimaAtividadeMs) / HORA_MS));
    const tempoDesdeCriacaoHoras = Math.max(0, Math.floor((agoraMs - new Date(lead.criado_em).getTime()) / HORA_MS));

    // Regra 1: Lead novo sem nenhum contato há mais de X horas
    if (lead.status === 'novo' && !lead.ultimo_contato_em) {
      const limiteMs = config.limite_sem_resposta_horas * HORA_MS;
      const diferencaMs = agoraMs - new Date(lead.criado_em).getTime();
      if (diferencaMs >= limiteMs) {
        alertas.push({
          lead_id: lead.id,
          lead_nome: lead.nome,
          lead_contato: lead.contato,
          lead_whatsapp: lead.whatsapp || null,
          lead_email: lead.email || null,
          lead_responsavel: lead.responsavel || null,
          lead_servico: lead.servico,
          origem: lead.origem,
          status: lead.status,
          tipo_alerta: 'sem_resposta',
          titulo: 'Lead novo sem resposta',
          descricao: `Aguardando primeiro contato há ${formatarHorasDias(tempoDesdeCriacaoHoras)}`,
          tempo_parado_horas: tempoDesdeCriacaoHoras,
          valor_em_risco: lead.valor_estimado,
          criado_em: lead.criado_em,
          ultimo_contato_em: lead.ultimo_contato_em,
          orcamento_enviado_em: lead.orcamento_enviado_em
        });
        continue;
      }
    }

    // Regra 2: Orçamento enviado sem follow-up há mais de X dias
    if (lead.status === 'orcamento_enviado') {
      const dataBaseMs = lead.ultimo_contato_em
        ? Math.max(new Date(lead.ultimo_contato_em).getTime(), lead.orcamento_enviado_em ? new Date(lead.orcamento_enviado_em).getTime() : 0)
        : (lead.orcamento_enviado_em ? new Date(lead.orcamento_enviado_em).getTime() : ultimaAtividadeMs);

      const limiteMs = config.limite_follow_up_dias * DIA_MS;
      const diferencaMs = agoraMs - dataBaseMs;

      if (diferencaMs >= limiteMs) {
        const horasParado = Math.max(0, Math.floor(diferencaMs / HORA_MS));
        alertas.push({
          lead_id: lead.id,
          lead_nome: lead.nome,
          lead_contato: lead.contato,
          lead_whatsapp: lead.whatsapp || null,
          lead_email: lead.email || null,
          lead_responsavel: lead.responsavel || null,
          lead_servico: lead.servico,
          origem: lead.origem,
          status: lead.status,
          tipo_alerta: 'sem_follow_up',
          titulo: 'Orçamento sem follow-up',
          descricao: `Orçamento enviado há ${formatarHorasDias(horasParado)} sem retorno`,
          tempo_parado_horas: horasParado,
          valor_em_risco: lead.valor_estimado,
          criado_em: lead.criado_em,
          ultimo_contato_em: lead.ultimo_contato_em,
          orcamento_enviado_em: lead.orcamento_enviado_em
        });
        continue;
      }
    }

    // Regra 3: Lead parado há mais de X dias sem nenhuma interação recente
    const limiteParadoMs = config.limite_lead_parado_dias * DIA_MS;
    const diferencaParadoMs = agoraMs - ultimaAtividadeMs;
    if (diferencaParadoMs >= limiteParadoMs) {
      alertas.push({
        lead_id: lead.id,
        lead_nome: lead.nome,
        lead_contato: lead.contato,
        lead_whatsapp: lead.whatsapp || null,
        lead_email: lead.email || null,
        lead_responsavel: lead.responsavel || null,
        lead_servico: lead.servico,
        origem: lead.origem,
        status: lead.status,
        tipo_alerta: 'lead_parado',
        titulo: 'Lead estagnado',
        descricao: `Sem nenhuma interação há ${formatarHorasDias(tempoDesdeUltimaAtividadeHoras)}`,
        tempo_parado_horas: tempoDesdeUltimaAtividadeHoras,
        valor_em_risco: lead.valor_estimado,
        criado_em: lead.criado_em,
        ultimo_contato_em: lead.ultimo_contato_em,
        orcamento_enviado_em: lead.orcamento_enviado_em
      });
    }
  }

  // Ordena os alertas pelo valor em risco (decrescente) e pelo tempo parado
  return alertas.sort((a, b) => b.valor_em_risco - a.valor_em_risco || b.tempo_parado_horas - a.tempo_parado_horas);
}

export function formatarHorasDias(horas: number): string {
  if (horas < 24) {
    return `${horas}h`;
  }
  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;
  if (horasRestantes === 0) {
    return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }
  return `${dias}d e ${horasRestantes}h`;
}

export function calcularMetricas(leads: Lead[], agora: Date = new Date()): MetricasRadar {
  let fechados = 0;
  let perdidos = 0;
  let valorEmAberto = 0;
  let valorPerdidoMes = 0;

  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth();

  const diferencasOrcamentoHoras: number[] = [];

  for (const lead of leads) {
    if (lead.status === 'fechado') {
      fechados++;
    } else if (lead.status === 'perdido') {
      perdidos++;

      // Checa se foi perdido no mês atual
      const dataPerda = lead.fechado_em ? new Date(lead.fechado_em) : new Date(lead.criado_em);
      if (dataPerda.getFullYear() === anoAtual && dataPerda.getMonth() === mesAtual) {
        valorPerdidoMes += lead.valor_estimado;
      }
    } else if (lead.status === 'novo' || lead.status === 'orcamento_enviado' || lead.status === 'standby') {
      valorEmAberto += lead.valor_estimado;
    }

    // Tempo entre criação/primeiro contato e envio de orçamento
    if (lead.orcamento_enviado_em) {
      const orcMs = new Date(lead.orcamento_enviado_em).getTime();
      const baseMs = lead.ultimo_contato_em
        ? Math.min(new Date(lead.ultimo_contato_em).getTime(), orcMs)
        : new Date(lead.criado_em).getTime();
      const difHoras = Math.max(0, (orcMs - baseMs) / HORA_MS);
      diferencasOrcamentoHoras.push(difHoras);
    }
  }

  const decididos = fechados + perdidos;
  const taxaFechamento = decididos > 0 ? Math.round((fechados / decididos) * 100) : null;

  const tempoMedioOrcamento = diferencasOrcamentoHoras.length > 0
    ? Number((diferencasOrcamentoHoras.reduce((a, b) => a + b, 0) / diferencasOrcamentoHoras.length).toFixed(1))
    : null;

  return {
    taxa_fechamento_percentual: taxaFechamento,
    total_fechados: fechados,
    total_perdidos: perdidos,
    tempo_medio_orcamento_horas: tempoMedioOrcamento,
    valor_em_aberto: valorEmAberto,
    valor_perdido_mes: valorPerdidoMes
  };
}

export function calcularMotivosPerda(leads: Lead[]): MotivoPerdaItem[] {
  const perdidos = leads.filter(l => l.status === 'perdido');
  if (perdidos.length === 0) return [];

  const grupos = new Map<string, { quantidade: number; valorTotal: number }>();

  for (const lead of perdidos) {
    const motivo = lead.motivo_perda?.trim() || 'Não especificado';
    const atual = grupos.get(motivo) || { quantidade: 0, valorTotal: 0 };
    atual.quantidade += 1;
    atual.valorTotal += lead.valor_estimado;
    grupos.set(motivo, atual);
  }

  const resultado: MotivoPerdaItem[] = [];
  for (const [motivo, dados] of grupos.entries()) {
    resultado.push({
      motivo,
      quantidade: dados.quantidade,
      valor_total: dados.valorTotal,
      percentual: Math.round((dados.quantidade / perdidos.length) * 100)
    });
  }

  // Ordena por quantidade (decrescente) e valor total
  return resultado.sort((a, b) => b.quantidade - a.quantidade || b.valor_total - a.valor_total);
}
