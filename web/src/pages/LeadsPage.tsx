import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import { Lead } from '@radar/shared';
import { CardLead } from '../components/CardLead.js';
import { ModalAcao } from '../components/ModalAcao.js';
import { ModalNovoLead } from '../components/ModalNovoLead.js';
import { ModalEditarLead } from '../components/ModalEditarLead.js';
import { LoadingState, EmptyState, ErrorState } from '../components/FeedbackStates.js';

export const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [origem, setOrigem] = useState('todos');
  const [ordenarPor, setOrdenarPor] = useState<'data' | 'valor'>('data');
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

  const carregarLeads = async () => {
    try {
      setCarregando(true);
      setErro(null);

      const params = new URLSearchParams();
      if (busca.trim()) params.append('busca', busca.trim());
      if (status !== 'todos') params.append('status', status);
      if (origem !== 'todos') params.append('origem', origem);
      params.append('ordenarPor', ordenarPor);
      params.append('ordem', ordem);

      const data = await apiFetch<Lead[]>(`/leads?${params.toString()}`);
      setLeads(data);
    } catch (err: any) {
      setErro(err.message || 'Falha ao buscar leads');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLeads();
  }, [busca, status, origem, ordenarPor, ordem]);

  const handleAcaoRapida = async (leadId: number, tipoAcao: 'contato' | 'orcamento' | 'fechou') => {
    try {
      await apiFetch(`/leads/${leadId}/acoes`, {
        method: 'POST',
        body: JSON.stringify({ tipo: tipoAcao })
      });
      await carregarLeads();
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
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--foreground)' }}>
            Todos os Leads
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
            {leads.length} {leads.length === 1 ? 'oportunidade encontrada' : 'oportunidades encontradas'}
          </p>
        </div>

        <button className="btn-acao primary" onClick={() => setModalNovoAberto(true)}>
          + Novo Lead
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔎 Buscar por nome, WhatsApp ou serviço..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</label>
            <select
              className="form-select"
              style={{ minHeight: '38px', padding: '6px 8px', fontSize: '13px' }}
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="novo">Novos</option>
              <option value="orcamento_enviado">Orçamentos</option>
              <option value="fechado">Fechados</option>
              <option value="perdido">Perdidos</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>ORIGEM</label>
            <select
              className="form-select"
              style={{ minHeight: '38px', padding: '6px 8px', fontSize: '13px' }}
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

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>ORDENAÇÃO</label>
            <select
              className="form-select"
              style={{ minHeight: '38px', padding: '6px 8px', fontSize: '13px' }}
              value={`${ordenarPor}-${ordem}`}
              onChange={e => {
                const [c, o] = e.target.value.split('-');
                setOrdenarPor(c as 'data' | 'valor');
                setOrdem(o as 'asc' | 'desc');
              }}
            >
              <option value="data-desc">Mais recentes</option>
              <option value="data-asc">Mais antigos</option>
              <option value="valor-desc">Maior valor</option>
              <option value="valor-asc">Menor valor</option>
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
        onCriado={carregarLeads}
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
