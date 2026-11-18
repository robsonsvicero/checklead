import React, { useState, useEffect, useRef } from 'react';
import { ApiError, apiFetch } from '../api/client.js';
import { AlertaLead, MetricasRadar, Lead } from '@radar/shared';
import { CardAlerta, TipoAcaoRapida } from '../components/CardAlerta.js';
import { ModalAcao } from '../components/ModalAcao.js';
import { ModalNovoLead } from '../components/ModalNovoLead.js';
import { ModalEditarLead } from '../components/ModalEditarLead.js';
import { FeedbackAcaoRapida } from '../components/FeedbackAcaoRapida.js';
import { LoadingState, EmptyState, ErrorState } from '../components/FeedbackStates.js';
import { formatarMoeda } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.js';

type RecuperacaoAcao = 'repetir' | 'atualizar' | 'nenhuma';

interface FeedbackAcao {
  tipo: 'sucesso' | 'erro';
  leadId: number;
  leadNome: string;
  tipoAcao: TipoAcaoRapida;
  mensagem: string;
  recuperacao: RecuperacaoAcao;
}

const obterErroAcao = (erro: unknown): { mensagem: string; recuperacao: RecuperacaoAcao } => {
  if (erro instanceof ApiError) {
    if (erro.status === 401) {
      return { mensagem: 'Sua sessão expirou. Entre novamente.', recuperacao: 'nenhuma' };
    }
    if (erro.status === 403) {
      return { mensagem: 'Você não tem permissão para registrar esta ação.', recuperacao: 'nenhuma' };
    }
    if (erro.status === 404) {
      return { mensagem: 'Este lead não está mais disponível. Atualize o Radar.', recuperacao: 'atualizar' };
    }
    if (erro.status === 429) {
      return { mensagem: 'Aguarde um momento e tente novamente.', recuperacao: 'repetir' };
    }
    if (erro.status === 400) {
      return { mensagem: erro.message || 'Revise os dados desta ação e tente novamente.', recuperacao: 'nenhuma' };
    }
    if (erro.status >= 500) {
      return {
        mensagem: 'Não foi possível confirmar se a ação foi registrada. Atualize o Radar antes de tentar novamente.',
        recuperacao: 'atualizar'
      };
    }
  }

  if (erro instanceof TypeError) {
    return {
      mensagem: 'Não foi possível confirmar se a ação foi registrada. Verifique a conexão e atualize o Radar.',
      recuperacao: 'atualizar'
    };
  }

  return {
    mensagem: 'Não foi possível confirmar se a ação foi registrada. Atualize o Radar antes de tentar novamente.',
    recuperacao: 'atualizar'
  };
};

interface RadarPageProps {
  onAtualizarAlertasTotal?: (total: number) => void;
}

export const RadarPage: React.FC<RadarPageProps> = ({ onAtualizarAlertasTotal }) => {
  const { checkAuth } = useAuth();
  const [alertas, setAlertas] = useState<AlertaLead[]>([]);
  const [metricas, setMetricas] = useState<MetricasRadar | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAtualizacao, setErroAtualizacao] = useState<string | null>(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<{
    leadId: number;
    tipoAcao: TipoAcaoRapida;
  } | null>(null);
  const [feedbackAcao, setFeedbackAcao] = useState<FeedbackAcao | null>(null);
  const acaoRapidaEmAndamentoRef = useRef(false);

  // Controle de Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [leadParaEditar, setLeadParaEditar] = useState<Lead | null>(null);
  const [modalAcao, setModalAcao] = useState<{
    aberto: boolean;
    tipo: 'perdeu' | 'nota';
    leadId: number;
    leadNome: string;
  }>({
    aberto: false,
    tipo: 'nota',
    leadId: 0,
    leadNome: ''
  });

  const handleEditarLead = async (leadId: number) => {
    try {
      const leadCompleto = await apiFetch<Lead>(`/leads/${leadId}`);
      setLeadParaEditar(leadCompleto);
    } catch (err: any) {
      alert(`Erro ao carregar dados do lead: ${err.message || 'Falha ao buscar dados'}`);
    }
  };

  const handleExcluirLead = async (leadId: number, leadNome: string) => {
    if (confirm(`Tem certeza que deseja excluir o lead "${leadNome}" e todo o histórico?`)) {
      try {
        await apiFetch(`/leads/${leadId}`, { method: 'DELETE' });
        await carregarDados();
      } catch (err: any) {
        alert(`Erro ao excluir: ${err.message || 'Falha na exclusão'}`);
      }
    }
  };

  const carregarDados = async (silencioso = false): Promise<boolean> => {
    try {
      if (silencioso) {
        setErroAtualizacao(null);
      } else {
        setCarregando(true);
        setErro(null);
        setErroAtualizacao(null);
      }

      const [alertasData, metricasData] = await Promise.all([
        apiFetch<AlertaLead[]>('/radar/alertas'),
        apiFetch<MetricasRadar>('/radar/metricas')
      ]);

      setAlertas(alertasData);
      setMetricas(metricasData);
      if (onAtualizarAlertasTotal) {
        onAtualizarAlertasTotal(alertasData.length);
      }
      return true;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        await checkAuth();
      }
      const mensagem = err instanceof ApiError && err.status >= 500
        ? 'Não foi possível carregar o Radar. Tente novamente.'
        : err instanceof TypeError
          ? 'Sem conexão com o servidor. Verifique sua conexão e tente novamente.'
          : err instanceof Error
            ? err.message
            : 'Não foi possível carregar o Radar. Tente novamente.';

      if (silencioso) {
        setErroAtualizacao(`Sua ação foi registrada, mas ${mensagem.charAt(0).toLowerCase()}${mensagem.slice(1)}`);
      } else {
        setErro(mensagem);
      }
      return false;
    } finally {
      if (!silencioso) {
        setCarregando(false);
      }
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleAcaoRapida = async (leadId: number, tipoAcao: TipoAcaoRapida) => {
    if (acaoRapidaEmAndamentoRef.current) {
      return;
    }

    const leadNome = alertas.find(alerta => alerta.lead_id === leadId)?.lead_nome ?? 'este lead';
    if (tipoAcao === 'fechou' && !window.confirm(`Confirmar que a venda de ${leadNome} foi fechada?`)) {
      return;
    }

    acaoRapidaEmAndamentoRef.current = true;
    setAcaoEmAndamento({ leadId, tipoAcao });
    setFeedbackAcao(null);
    setErroAtualizacao(null);

    const nomeAcao = {
      contato: 'o contato',
      orcamento: 'o envio do orçamento',
      fechou: 'o fechamento'
    }[tipoAcao];

    try {
      await apiFetch(`/leads/${leadId}/acoes`, {
        method: 'POST',
        body: JSON.stringify({ tipo: tipoAcao })
      });
      setFeedbackAcao({
        tipo: 'sucesso',
        leadId,
        leadNome,
        tipoAcao,
        mensagem: `${nomeAcao} registrado para ${leadNome}.`,
        recuperacao: 'nenhuma'
      });
      await carregarDados(true);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        await checkAuth();
      }
      const resultado = obterErroAcao(err);
      setFeedbackAcao({
        tipo: 'erro',
        leadId,
        leadNome,
        tipoAcao,
        mensagem: `Não foi possível registrar ${nomeAcao} para ${leadNome}. ${resultado.mensagem}`,
        recuperacao: resultado.recuperacao
      });
    } finally {
      acaoRapidaEmAndamentoRef.current = false;
      setAcaoEmAndamento(null);
    }
  };

  const handleAtualizarAcao = async () => {
    if (await carregarDados(true)) {
      setFeedbackAcao(null);
    }
  };

  const handleAbrirModal = (tipo: 'perdeu' | 'nota', leadId: number, leadNome: string) => {
    setModalAcao({
      aberto: true,
      tipo,
      leadId,
      leadNome
    });
  };

  const handleLeadCriado = (_novoLead: Lead) => {
    carregarDados();
  };

  return (
    <div className="container">
      {/* Seção Principal: Agir Agora */}
      <div className="radar-page-heading">
        <div>
          <h2 className="radar-title">
            ⚠️ Agir agora
          </h2>
          <p className="radar-subtitle">
            Onde você está correndo risco de perder a venda
          </p>
        </div>

        <button
          className="btn-acao primary"
          onClick={() => setModalNovoAberto(true)}
        >
          + Novo Lead
        </button>
      </div>

      {feedbackAcao && (
        <FeedbackAcaoRapida
          tipo={feedbackAcao.tipo}
          mensagem={feedbackAcao.mensagem}
          acao={feedbackAcao.tipo === 'erro' && feedbackAcao.recuperacao === 'repetir'
            ? {
                rotulo: 'Tentar novamente',
                executar: () => handleAcaoRapida(feedbackAcao.leadId, feedbackAcao.tipoAcao),
                desabilitada: acaoEmAndamento !== null
              }
            : feedbackAcao.tipo === 'erro' && feedbackAcao.recuperacao === 'atualizar'
              ? { rotulo: 'Atualizar Radar', executar: handleAtualizarAcao }
              : undefined}
        />
      )}

      {erroAtualizacao && (
        <div className="radar-feedback aviso" role="alert">
          <span>{erroAtualizacao}</span>
          <button className="btn-acao" onClick={() => carregarDados(true)}>
            Atualizar Radar
          </button>
        </div>
      )}

      {carregando && <LoadingState mensagem="Analisando oportunidades no Radar..." />}

      {erro && <ErrorState mensagem={erro} onTentarNovamente={carregarDados} />}

      {!carregando && !erro && alertas.length === 0 && (
        <EmptyState
          titulo="Nenhum alerta pendente"
          mensagem="Nenhum lead está com resposta atrasada, orçamento sem retorno ou parado há muito tempo."
          acao={
            <button className="btn-acao primary" onClick={() => setModalNovoAberto(true)}>
              Cadastrar Novo Lead
            </button>
          }
        />
      )}

      {!carregando && !erro && alertas.length > 0 && (
        <div>
          {alertas.map(alerta => (
            <CardAlerta
              key={`${alerta.lead_id}-${alerta.tipo_alerta}`}
              alerta={alerta}
              onAcaoRapida={handleAcaoRapida}
              onAbrirModal={handleAbrirModal}
              acaoRapidaDesabilitada={acaoEmAndamento !== null}
              tipoAcaoEmAndamento={acaoEmAndamento?.leadId === alerta.lead_id
                ? acaoEmAndamento.tipoAcao
                : null}
              onEditar={handleEditarLead}
              onExcluir={handleExcluirLead}
            />
          ))}
        </div>
      )}

      {metricas && (
        <div className="metricas-grid">
          <div className="metrica-card success">
            <span className="label">Taxa de Fechamento</span>
            <span className="valor">
              {metricas.taxa_fechamento_percentual !== null
                ? `${metricas.taxa_fechamento_percentual}%`
                : '—'}
            </span>
            <small className="metrica-note">
              {metricas.total_fechados} fechados · {metricas.total_perdidos} perdidos
            </small>
          </div>

          <div className="metrica-card info">
            <span className="label">Tempo até Orçamento</span>
            <span className="valor">
              {metricas.tempo_medio_orcamento_horas !== null
                ? `${metricas.tempo_medio_orcamento_horas}h`
                : '—'}
            </span>
            <small className="metrica-note">
              média 1º contato → envio
            </small>
          </div>

          <div className="metrica-card primary">
            <span className="label">Valor em Aberto</span>
            <span className="valor">
              {formatarMoeda(metricas.valor_em_aberto)}
            </span>
            <small className="metrica-note">
              leads novos e orçados
            </small>
          </div>

          <div className="metrica-card danger">
            <span className="label">Perdido no Mês</span>
            <span className="valor">
              {formatarMoeda(metricas.valor_perdido_mes)}
            </span>
            <small className="metrica-note">
              {metricas.total_perdidos} leads perdidos
            </small>
          </div>
        </div>
      )}

      {/* Botão flutuante no desktop */}
      <button
        className="fab-novo-lead"
        onClick={() => setModalNovoAberto(true)}
        title="Cadastrar lead em menos de 20 segundos"
      >
        <span style={{ fontSize: '20px' }}>⚡</span>
        <span>Novo Lead</span>
      </button>

      {/* Modais */}
      <ModalNovoLead
        aberto={modalNovoAberto}
        onFechar={() => setModalNovoAberto(false)}
        onCriado={handleLeadCriado}
      />

      <ModalEditarLead
        aberto={leadParaEditar !== null}
        lead={leadParaEditar}
        onFechar={() => setLeadParaEditar(null)}
        onAtualizado={() => carregarDados()}
      />

      <ModalAcao
        aberto={modalAcao.aberto}
        tipo={modalAcao.tipo}
        leadId={modalAcao.leadId}
        leadNome={modalAcao.leadNome}
        onFechar={() => setModalAcao(prev => ({ ...prev, aberto: false }))}
        onSucesso={carregarDados}
      />
    </div>
  );
};
