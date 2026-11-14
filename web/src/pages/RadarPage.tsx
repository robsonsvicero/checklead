import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import { AlertaLead, MetricasRadar, Lead } from '@radar/shared';
import { CardAlerta } from '../components/CardAlerta.js';
import { ModalAcao } from '../components/ModalAcao.js';
import { ModalNovoLead } from '../components/ModalNovoLead.js';
import { LoadingState, EmptyState, ErrorState } from '../components/FeedbackStates.js';
import { formatarMoeda } from '../utils/formatters.js';

interface RadarPageProps {
  onAtualizarAlertasTotal?: (total: number) => void;
}

export const RadarPage: React.FC<RadarPageProps> = ({ onAtualizarAlertasTotal }) => {
  const [alertas, setAlertas] = useState<AlertaLead[]>([]);
  const [metricas, setMetricas] = useState<MetricasRadar | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Controle de Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
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

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro(null);

      const [alertasData, metricasData] = await Promise.all([
        apiFetch<AlertaLead[]>('/radar/alertas'),
        apiFetch<MetricasRadar>('/radar/metricas')
      ]);

      setAlertas(alertasData);
      setMetricas(metricasData);
      if (onAtualizarAlertasTotal) {
        onAtualizarAlertasTotal(alertasData.length);
      }
    } catch (err: any) {
      setErro(err.message || 'Falha ao carregar dados do Radar');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleAcaoRapida = async (leadId: number, tipoAcao: 'contato' | 'orcamento' | 'fechou') => {
    try {
      await apiFetch(`/leads/${leadId}/acoes`, {
        method: 'POST',
        body: JSON.stringify({ tipo: tipoAcao })
      });
      await carregarDados();
    } catch (err: any) {
      alert(`Erro ao registrar ação: ${err.message || 'Erro desconhecido'}`);
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
      {/* 4 Métricas de Impacto no Topo */}
      {metricas && (
        <div className="metricas-grid">
          <div className="metrica-card">
            <span className="label">Taxa de Fechamento</span>
            <span className="valor" style={{ color: 'var(--primary)' }}>
              {metricas.taxa_fechamento_percentual !== null
                ? `${metricas.taxa_fechamento_percentual}%`
                : '—'}
            </span>
            <small style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              {metricas.total_fechados} de {metricas.total_fechados + metricas.total_perdidos} decididos
            </small>
          </div>

          <div className="metrica-card">
            <span className="label">Tempo até Orçamento</span>
            <span className="valor">
              {metricas.tempo_medio_orcamento_horas !== null
                ? `${metricas.tempo_medio_orcamento_horas}h`
                : '—'}
            </span>
            <small style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              média 1º contato → envio
            </small>
          </div>

          <div className="metrica-card">
            <span className="label">Valor em Aberto</span>
            <span className="valor">
              {formatarMoeda(metricas.valor_em_aberto)}
            </span>
            <small style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              leads novos e orçados
            </small>
          </div>

          <div className="metrica-card danger">
            <span className="label">Perdido no Mês</span>
            <span className="valor">
              {formatarMoeda(metricas.valor_perdido_mes)}
            </span>
            <small style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              {metricas.total_perdidos} leads perdidos
            </small>
          </div>
        </div>
      )}

      {/* Seção Principal: Agir Agora */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--foreground)' }}>
            ⚠️ Agir agora
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
            Onde você está correndo risco de perder a venda
          </p>
        </div>

        <button
          className="btn-acao primary"
          onClick={() => setModalNovoAberto(true)}
          style={{ padding: '8px 14px' }}
        >
          + Novo Lead
        </button>
      </div>

      {carregando && <LoadingState mensagem="Analisando oportunidades no Radar..." />}

      {erro && <ErrorState mensagem={erro} onTentarNovamente={carregarDados} />}

      {!carregando && !erro && alertas.length === 0 && (
        <EmptyState
          titulo="Tudo sob controle! 🎯"
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
            />
          ))}
        </div>
      )}

      {/* Botão Flutuante (FAB) para agilidade no celular */}
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
