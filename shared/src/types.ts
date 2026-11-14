export type LeadStatus = 'novo' | 'orcamento_enviado' | 'fechado' | 'perdido';

export type LeadOrigem = 'Instagram' | 'indicação' | 'site' | 'outro';

export type InteracaoTipo = 'contato' | 'orcamento' | 'follow_up' | 'nota';

export interface Lead {
  id: number;
  nome: string;
  contato: string;
  whatsapp: string | null;
  email: string | null;
  responsavel: string | null;
  servico: string;
  origem: LeadOrigem;
  valor_estimado: number; // centavos
  status: LeadStatus;
  criado_em: string; // ISO string
  ultimo_contato_em: string | null;
  orcamento_enviado_em: string | null;
  fechado_em: string | null;
  motivo_perda: string | null;
  proxima_acao_em: string | null;
}

export interface Interacao {
  id: number;
  lead_id: number;
  tipo: InteracaoTipo;
  texto: string;
  criado_em: string; // ISO string
}

export interface LeadComInteracoes extends Lead {
  interacoes: Interacao[];
}

export interface Configuracao {
  limite_sem_resposta_horas: number;
  limite_follow_up_dias: number;
  limite_lead_parado_dias: number;
}

export type TipoAlerta = 'sem_resposta' | 'sem_follow_up' | 'lead_parado';

export interface AlertaLead {
  lead_id: number;
  lead_nome: string;
  lead_contato: string;
  lead_whatsapp: string | null;
  lead_email: string | null;
  lead_responsavel: string | null;
  lead_servico: string;
  origem: LeadOrigem;
  status: LeadStatus;
  tipo_alerta: TipoAlerta;
  titulo: string;
  descricao: string;
  tempo_parado_horas: number;
  valor_em_risco: number; // centavos
  criado_em: string;
  ultimo_contato_em: string | null;
  orcamento_enviado_em: string | null;
}

export interface MetricasRadar {
  taxa_fechamento_percentual: number | null; // null se fechados + perdidos == 0
  total_fechados: number;
  total_perdidos: number;
  tempo_medio_orcamento_horas: number | null;
  valor_em_aberto: number; // centavos (status novo ou orcamento_enviado)
  valor_perdido_mes: number; // centavos perdidos no mês atual
}

export interface MotivoPerdaItem {
  motivo: string;
  quantidade: number;
  valor_total: number;
  percentual: number;
}

export interface AuthStatus {
  hasUser: boolean;
  authenticated: boolean;
}

export interface ExportData {
  versao: string;
  gerado_em: string;
  configuracao: Configuracao;
  leads: Lead[];
  interacoes: Interacao[];
}
