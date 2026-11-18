import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api/client.js';
import { Lead } from '@radar/shared';
import { CardLead } from '../components/CardLead.js';
import { ModalAcao } from '../components/ModalAcao.js';
import { ModalNovoLead } from '../components/ModalNovoLead.js';
import { ModalEditarLead } from '../components/ModalEditarLead.js';
import { FeedbackAcaoRapida } from '../components/FeedbackAcaoRapida.js';
import { LoadingState, EmptyState, ErrorState } from '../components/FeedbackStates.js';

type TipoAcaoRapida = 'contato' | 'orcamento' | 'fechou' | 'standby' | 'reativar';

export const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<{ leadId: number; tipoAcao: TipoAcaoRapida } | null>(null);
  const [feedbackAcao, setFeedbackAcao] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; mensagem: string } | null>(null);
  const acaoRapidaEmAndamentoRef = useRef(false);

  // Filtros
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [origem, setOrigem] = useState('todos');
  const [ordenarPor, setOrdenarPor] = useState<'data' | 'valor' | 'nome'>('data');
  const [ordem, setOrdem] = useState<'asc' | 'desc'>('desc');

  // Modais
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

  const carregarLeads = async (silencioso = false): Promise<boolean> => {
    try {
      if (!silencioso) {
        setCarregando(true);
        setErro(null);
      }

      const params = new URLSearchParams();
      if (busca.trim()) params.append('busca', busca.trim());
      if (status !== 'todos') params.append('status', status);
      if (origem !== 'todos') params.append('origem', origem);
      params.append('ordenarPor', ordenarPor);
      params.append('ordem', ordem);

      const data = await apiFetch<Lead[]>(`/leads?${params.toString()}`);
      setLeads(data);
      return true;
    } catch (err: any) {
      if (!silencioso) {
        setErro(err.message || 'Falha ao buscar leads');
      }
      return false;
    } finally {
      if (!silencioso) {
        setCarregando(false);
      }
    }
  };

  useEffect(() => {
    setFeedbackAcao(null);
    carregarLeads();
  }, [busca, status, origem, ordenarPor, ordem]);

  const handleAcaoRapida = async (leadId: number, tipoAcao: TipoAcaoRapida) => {
    if (acaoRapidaEmAndamentoRef.current) return;

    const leadNome = leads.find(lead => lead.id === leadId)?.nome ?? 'este lead';
    if (tipoAcao === 'fechou' && !window.confirm(`Confirmar que a venda de ${leadNome} foi fechada?`)) {
      return;
    }

    acaoRapidaEmAndamentoRef.current = true;
    setAcaoEmAndamento({ leadId, tipoAcao });
    setFeedbackAcao(null);

    try {
      await apiFetch(`/leads/${leadId}/acoes`, {
        method: 'POST',
        body: JSON.stringify({ tipo: tipoAcao })
      });
      const listaAtualizada = await carregarLeads(true);
      setFeedbackAcao({
        tipo: listaAtualizada ? 'sucesso' : 'aviso',
        mensagem: listaAtualizada
          ? `Ação registrada para ${leadNome}.`
          : `Ação registrada para ${leadNome}, mas a lista não foi atualizada. Atualize para conferir.`
      });
    } catch {
      setFeedbackAcao({
        tipo: 'erro',
        mensagem: `Não foi possível confirmar se a ação foi registrada para ${leadNome}. Atualize a lista antes de tentar novamente.`
      });
    } finally {
      acaoRapidaEmAndamentoRef.current = false;
      setAcaoEmAndamento(null);
    }
  };

  const handleAtualizarAposAcao = async () => {
    if (await carregarLeads(true)) {
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

  const handleExcluirLead = async (leadId: number, leadNome: string) => {
    if (confirm(`Tem certeza que deseja excluir o lead "${leadNome}" e todo o histórico?`)) {
      try {
        await apiFetch(`/leads/${leadId}`, { method: 'DELETE' });
        await carregarLeads();
      } catch (err: any) {
        alert(`Erro ao excluir: ${err.message || 'Falha na exclusão'}`);
      }
    }
  };

  return (
    <div className="container leads-page">
      <div className="leads-page-heading">
        <div className="leads-heading-copy">
          <h2 className="leads-page-title">
            Todos os Leads
          </h2>
          <p className="leads-page-count">
            {leads.length} {leads.length === 1 ? 'oportunidade encontrada' : 'oportunidades encontradas'}
          </p>
        </div>

        <button className="btn-acao primary" onClick={() => setModalNovoAberto(true)}>
          + Novo Lead
        </button>
      </div>

      {feedbackAcao && (
        <FeedbackAcaoRapida
          tipo={feedbackAcao.tipo}
          mensagem={feedbackAcao.mensagem}
          acao={feedbackAcao.tipo !== 'sucesso'
            ? { rotulo: 'Atualizar lista', executar: handleAtualizarAposAcao, desabilitada: acaoEmAndamento !== null }
            : undefined}
        />
      )}

      {/* Barra de Busca e Filtros */}
      <div className="leads-filters">
        <div className="leads-search">
          <input
            type="text"
            className="form-input"
            aria-label="Buscar leads por nome, WhatsApp ou serviço"
            placeholder="🔎 Buscar por nome, WhatsApp ou serviço..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <div className="leads-filter-grid">
          <div className="leads-filter-field">
            <label className="leads-filter-label" htmlFor="lead-status-filter">STATUS</label>
            <select
              id="lead-status-filter"
              className="form-select leads-filter-select"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="novo">Novos</option>
              <option value="orcamento_enviado">Orçamentos</option>
              <option value="standby">Standby</option>
              <option value="fechado">Fechados</option>
              <option value="perdido">Perdidos</option>
            </select>
          </div>

          <div className="leads-filter-field">
            <label className="leads-filter-label" htmlFor="lead-origin-filter">ORIGEM</label>
            <select
              id="lead-origin-filter"
              className="form-select leads-filter-select"
              value={origem}
              onChange={e => setOrigem(e.target.value)}
            >
              <option value="todos">Todas origens</option>
              <option value="Instagram">Instagram</option>
              <option value="indicação">Indicação</option>
              <option value="site">Site</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="leads-filter-field">
            <label className="leads-filter-label" htmlFor="lead-order-filter">ORDENAÇÃO</label>
            <select
              id="lead-order-filter"
              className="form-select leads-filter-select"
              value={`${ordenarPor}-${ordem}`}
              onChange={e => {
                const [c, o] = e.target.value.split('-');
                setOrdenarPor(c as 'data' | 'valor' | 'nome');
                setOrdem(o as 'asc' | 'desc');
              }}
            >
              <option value="data-desc">Mais recentes</option>
              <option value="data-asc">Mais antigos</option>
              <option value="valor-desc">Maior valor</option>
              <option value="valor-asc">Menor valor</option>
              <option value="nome-asc">Nome (A-Z)</option>
              <option value="nome-desc">Nome (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {carregando && <LoadingState mensagem="Carregando lista de leads..." />}

      {erro && <ErrorState mensagem={erro} onTentarNovamente={carregarLeads} />}

      {!carregando && !erro && leads.length === 0 && (
        <EmptyState
          titulo="Nenhum lead encontrado"
          mensagem="Tente alterar os filtros de busca ou cadastre uma nova oportunidade."
          acao={
            <button className="btn-acao primary" onClick={() => setModalNovoAberto(true)}>
              Cadastrar Lead Agora
            </button>
          }
        />
      )}

      {!carregando && !erro && leads.length > 0 && (
        <div>
          {leads.map(lead => (
            <CardLead
              key={lead.id}
              lead={lead}
              onAcaoRapida={handleAcaoRapida}
              acaoEmAndamento={acaoEmAndamento}
              onAbrirModal={handleAbrirModal}
              onEditar={(l) => setLeadParaEditar(l)}
              onExcluir={handleExcluirLead}
            />
          ))}
        </div>
      )}

      <button
        className="fab-novo-lead"
        onClick={() => setModalNovoAberto(true)}
      >
        <span style={{ fontSize: '20px' }}>⚡</span>
        <span>Novo Lead</span>
      </button>

      <ModalNovoLead
        aberto={modalNovoAberto}
        onFechar={() => setModalNovoAberto(false)}
        onCriado={() => carregarLeads()}
      />

      <ModalEditarLead
        aberto={leadParaEditar !== null}
        lead={leadParaEditar}
        onFechar={() => setLeadParaEditar(null)}
        onAtualizado={() => carregarLeads()}
      />

      <ModalAcao
        aberto={modalAcao.aberto}
        tipo={modalAcao.tipo}
        leadId={modalAcao.leadId}
        leadNome={modalAcao.leadNome}
        onFechar={() => setModalAcao(prev => ({ ...prev, aberto: false }))}
        onSucesso={carregarLeads}
      />
    </div>
  );
};
