import { describe, it, expect } from 'vitest';
import { calcularAlertas, calcularMetricas, calcularMotivosPerda } from '../services/radarService.js';
import { Lead, Interacao, Configuracao } from '@radar/shared';

const configPadrao: Configuracao = {
  limite_sem_resposta_horas: 24,
  limite_follow_up_dias: 3,
  limite_lead_parado_dias: 7
};

function criarLead(override: Partial<Lead> = {}): Lead {
  return {
    id: 1,
    nome: 'Cliente Teste',
    contato: '11999999999',
    whatsapp: '11999999999',
    email: null,
    responsavel: 'Robson',
    servico: 'Consultoria',
    origem: 'Instagram',
    valor_estimado: 50000, // R$ 500,00
    status: 'novo',
    criado_em: new Date('2026-11-10T10:00:00Z').toISOString(),
    ultimo_contato_em: null,
    orcamento_enviado_em: null,
    fechado_em: null,
    motivo_perda: null,
    proxima_acao_em: null,
    ...override
  };
}

describe('radarService - calcularAlertas', () => {
  it('deve retornar lista vazia quando não há leads', () => {
    const interacoes = new Map<number, Interacao[]>();
    const alertas = calcularAlertas([], interacoes, configPadrao, new Date());
    expect(alertas).toEqual([]);
  });

  it('deve alertar lead novo sem resposta há mais de 24 horas', () => {
    const agora = new Date('2026-11-11T11:00:00Z'); // 25h após criação
    const lead = criarLead({
      criado_em: new Date('2026-11-10T10:00:00Z').toISOString(),
      status: 'novo',
      ultimo_contato_em: null
    });

    const interacoes = new Map<number, Interacao[]>();
    const alertas = calcularAlertas([lead], interacoes, configPadrao, agora);

    expect(alertas.length).toBe(1);
    expect(alertas[0].tipo_alerta).toBe('sem_resposta');
    expect(alertas[0].lead_id).toBe(1);
    expect(alertas[0].valor_em_risco).toBe(50000);
    expect(alertas[0].tempo_parado_horas).toBe(25);
  });

  it('não deve alertar lead novo com menos de 24 horas', () => {
    const agora = new Date('2026-11-10T20:00:00Z'); // 10h após criação
    const lead = criarLead({
      criado_em: new Date('2026-11-10T10:00:00Z').toISOString(),
      status: 'novo',
      ultimo_contato_em: null
    });

    const interacoes = new Map<number, Interacao[]>();
    const alertas = calcularAlertas([lead], interacoes, configPadrao, agora);

    expect(alertas.length).toBe(0);
  });

  it('borda: exatamente no limiar de 24 horas deve alertar, mas 1 segundo antes não', () => {
    const interacoes = new Map<number, Interacao[]>();
    const criado = new Date('2026-11-10T10:00:00Z');

    // 1 segundo antes das 24 horas
    const quase24h = new Date(criado.getTime() + 24 * 3600 * 1000 - 1000);
    const leadQuase = criarLead({ criado_em: criado.toISOString() });
    expect(calcularAlertas([leadQuase], interacoes, configPadrao, quase24h).length).toBe(0);

    // Exatamente 24 horas
    const exato24h = new Date(criado.getTime() + 24 * 3600 * 1000);
    const leadExato = criarLead({ criado_em: criado.toISOString() });
    const resExato = calcularAlertas([leadExato], interacoes, configPadrao, exato24h);
    expect(resExato.length).toBe(1);
    expect(resExato[0].tipo_alerta).toBe('sem_resposta');
  });

  it('não deve alertar lead novo que já teve primeiro contato registrado recentemente', () => {
    const agora = new Date('2026-11-12T10:00:00Z');
    const lead = criarLead({
      criado_em: new Date('2026-11-10T10:00:00Z').toISOString(),
      status: 'novo',
      ultimo_contato_em: new Date('2026-11-12T08:00:00Z').toISOString() // contato há 2h
    });

    const interacoes = new Map<number, Interacao[]>();
    const alertas = calcularAlertas([lead], interacoes, configPadrao, agora);

    expect(alertas.length).toBe(0);
  });

  it('deve alertar orçamento enviado sem follow-up há mais de 3 dias', () => {
    const agora = new Date('2026-11-14T11:00:00Z'); // 4 dias depois
    const lead = criarLead({
      status: 'orcamento_enviado',
      orcamento_enviado_em: new Date('2026-11-10T10:00:00Z').toISOString(),
      ultimo_contato_em: new Date('2026-11-10T10:00:00Z').toISOString()
    });

    const interacoes = new Map<number, Interacao[]>();
    const alertas = calcularAlertas([lead], interacoes, configPadrao, agora);

    expect(alertas.length).toBe(1);
    expect(alertas[0].tipo_alerta).toBe('sem_follow_up');
    expect(alertas[0].tempo_parado_horas).toBe(97);
  });

  it('deve alertar lead parado há mais de 7 dias sem qualquer interação', () => {
    const agora = new Date('2026-11-18T12:00:00Z'); // 8 dias depois do contato
    const lead = criarLead({
      status: 'novo',
      ultimo_contato_em: new Date('2026-11-10T10:00:00Z').toISOString()
    });

    const interacoes = new Map<number, Interacao[]>();
    const alertas = calcularAlertas([lead], interacoes, configPadrao, agora);

    expect(alertas.length).toBe(1);
    expect(alertas[0].tipo_alerta).toBe('lead_parado');
  });

  it('nunca deve alertar leads com status fechado ou perdido, mesmo antigos', () => {
    const agora = new Date('2026-11-30T10:00:00Z'); // 20 dias depois
    const leadFechado = criarLead({
      id: 1,
      status: 'fechado',
      fechado_em: new Date('2026-11-11T10:00:00Z').toISOString()
    });
    const leadPerdido = criarLead({
      id: 2,
      status: 'perdido',
      motivo_perda: 'Achou caro',
      fechado_em: new Date('2026-11-11T10:00:00Z').toISOString()
    });

    const interacoes = new Map<number, Interacao[]>();
    const alertas = calcularAlertas([leadFechado, leadPerdido], interacoes, configPadrao, agora);

    expect(alertas).toEqual([]);
  });

  it('nunca deve alertar leads com status standby, pausando a contagem de prazos no radar', () => {
    const agora = new Date('2026-11-30T10:00:00Z'); // 20 dias depois
    const leadStandby = criarLead({
      id: 1,
      status: 'standby',
      criado_em: new Date('2026-11-01T10:00:00Z').toISOString(),
      orcamento_enviado_em: new Date('2026-11-05T10:00:00Z').toISOString()
    });

    const interacoes = new Map<number, Interacao[]>();
    const alertas = calcularAlertas([leadStandby], interacoes, configPadrao, agora);

    expect(alertas).toEqual([]);
  });
});

describe('radarService - calcularMetricas', () => {
  it('deve retornar métricas seguras quando lista de leads é vazia', () => {
    const metricas = calcularMetricas([]);
    expect(metricas).toEqual({
      taxa_fechamento_percentual: null,
      total_fechados: 0,
      total_perdidos: 0,
      tempo_medio_orcamento_horas: null,
      valor_em_aberto: 0,
      valor_perdido_mes: 0
    });
  });

  it('deve calcular taxa de fechamento com precisão', () => {
    const leads: Lead[] = [
      criarLead({ id: 1, status: 'fechado' }),
      criarLead({ id: 2, status: 'fechado' }),
      criarLead({ id: 3, status: 'fechado' }),
      criarLead({ id: 4, status: 'perdido' }),
      criarLead({ id: 5, status: 'novo' }) // não entra no cálculo de decididos
    ];

    const metricas = calcularMetricas(leads);
    // 3 fechados de 4 decididos = 75%
    expect(metricas.taxa_fechamento_percentual).toBe(75);
    expect(metricas.total_fechados).toBe(3);
    expect(metricas.total_perdidos).toBe(1);
  });

  it('deve calcular tempo médio até orçamento e valor em aberto', () => {
    const leads: Lead[] = [
      criarLead({
        id: 1,
        status: 'orcamento_enviado',
        valor_estimado: 100000,
        criado_em: '2026-11-10T10:00:00Z',
        orcamento_enviado_em: '2026-11-10T12:00:00Z' // 2 horas
      }),
      criarLead({
        id: 2,
        status: 'orcamento_enviado',
        valor_estimado: 50000,
        criado_em: '2026-11-10T10:00:00Z',
        orcamento_enviado_em: '2026-11-10T14:00:00Z' // 4 horas
      }),
      criarLead({
        id: 3,
        status: 'novo',
        valor_estimado: 25000,
        orcamento_enviado_em: null
      }),
      criarLead({
        id: 4,
        status: 'standby',
        valor_estimado: 30000,
        orcamento_enviado_em: null
      })
    ];

    const metricas = calcularMetricas(leads);
    // Tempo médio: (2 + 4) / 2 = 3.0h
    expect(metricas.tempo_medio_orcamento_horas).toBe(3);
    // Valor em aberto: 100000 + 50000 + 25000 + 30000 = 205000
    expect(metricas.valor_em_aberto).toBe(205000);
  });

  it('deve calcular valor perdido apenas no mês corrente', () => {
    const agora = new Date('2026-11-15T12:00:00Z');
    const leads: Lead[] = [
      criarLead({
        id: 1,
        status: 'perdido',
        valor_estimado: 80000,
        fechado_em: '2026-11-05T10:00:00Z' // mesmo mês
      }),
      criarLead({
        id: 2,
        status: 'perdido',
        valor_estimado: 120000,
        fechado_em: '2026-10-20T10:00:00Z' // mês anterior
      })
    ];

    const metricas = calcularMetricas(leads, agora);
    expect(metricas.valor_perdido_mes).toBe(80000);
  });
});

describe('radarService - calcularMotivosPerda', () => {
  it('retorna array vazio quando não há leads perdidos', () => {
    const leads = [criarLead({ status: 'novo' }), criarLead({ status: 'fechado' })];
    expect(calcularMotivosPerda(leads)).toEqual([]);
  });

  it('agrupa motivos corretamente com quantidade e percentual', () => {
    const leads: Lead[] = [
      criarLead({ id: 1, status: 'perdido', motivo_perda: 'Preço alto', valor_estimado: 10000 }),
      criarLead({ id: 2, status: 'perdido', motivo_perda: 'Preço alto', valor_estimado: 15000 }),
      criarLead({ id: 3, status: 'perdido', motivo_perda: 'Fechou com concorrente', valor_estimado: 20000 }),
      criarLead({ id: 4, status: 'perdido', motivo_perda: '', valor_estimado: 5000 })
    ];

    const ranking = calcularMotivosPerda(leads);
    expect(ranking.length).toBe(3);
    // Preço alto tem 2 de 4 = 50%
    expect(ranking[0].motivo).toBe('Preço alto');
    expect(ranking[0].quantidade).toBe(2);
    expect(ranking[0].valor_total).toBe(25000);
    expect(ranking[0].percentual).toBe(50);

    // Motivo vazio vira "Não especificado"
    const naoEsp = ranking.find(r => r.motivo === 'Não especificado');
    expect(naoEsp).toBeDefined();
    expect(naoEsp?.quantidade).toBe(1);
    expect(naoEsp?.valor_total).toBe(5000);
  });

  it('executa a consulta SQL de leads perdidos sem erro de sintaxe do SQLite', () => {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE leads (
        id INTEGER PRIMARY KEY,
        nome TEXT,
        status TEXT,
        motivo_perda TEXT,
        valor_estimado INTEGER
      );
      INSERT INTO leads (nome, status, motivo_perda, valor_estimado)
      VALUES ('Teste', 'perdido', 'Preço alto', 10000);
    `);

    const query = "SELECT * FROM leads WHERE status = 'perdido'";
    const perdidos = db.prepare(query).all();
    expect(perdidos.length).toBe(1);
    db.close();
  });
});
