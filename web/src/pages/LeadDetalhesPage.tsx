import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { LeadComInteracoes } from '@radar/shared';
import { formatarMoeda, formatarDataHora, gerarLinkContato } from '../utils/formatters.js';
import { LoadingState, ErrorState } from '../components/FeedbackStates.js';
import { ModalAcao } from '../components/ModalAcao.js';
import { ModalEditarLead } from '../components/ModalEditarLead.js';

export const LeadDetalhesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<LeadComInteracoes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);

  const [modalAcao, setModalAcao] = useState<{
    aberto: boolean;
    tipo: 'perdeu' | 'nota';
  }>({
    aberto: false,
    tipo: 'nota'
  });

  const carregarLead = async () => {
    try {
      setCarregando(true);
      setErro(null);
      const data = await apiFetch<LeadComInteracoes>(`/leads/${id}`);
      setLead(data);
    } catch (err: any) {
      setErro(err.message || 'Falha ao carregar detalhes do lead');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLead();
  }, [id]);

  const handleAcaoRapida = async (tipoAcao: 'contato' | 'orcamento' | 'fechou') => {
    if (!lead) return;
    try {
      await apiFetch(`/leads/${lead.id}/acoes`, {
        method: 'POST',
        body: JSON.stringify({ tipo: tipoAcao })
      });
      await carregarLead();
    } catch (err: any) {
      alert(`Erro: ${err.message || 'Falha ao executar ação'}`);
    }
  };

  const handleExcluir = async () => {
    if (!lead) return;
    if (confirm(`Tem certeza que deseja excluir o lead "${lead.nome}" e todo o histórico?`)) {
      try {
        await apiFetch(`/leads/${lead.id}`, { method: 'DELETE' });
        navigate('/leads');
      } catch (err: any) {
        alert(`Erro ao excluir: ${err.message || 'Falha na exclusão'}`);
      }
    }
  };

  if (carregando) {
    return (
      <div className="container">
        <LoadingState mensagem="Carregando histórico do lead..." />
      </div>
    );
  }

  if (erro || !lead) {
    return (
      <div className="container">
        <ErrorState
          mensagem={erro || 'Lead não encontrado'}
          onTentarNovamente={carregarLead}
        />
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Link to="/leads" className="btn-acao">← Voltar para lista</Link>
        </div>
      </div>
    );
  }

  const contatoInfo = gerarLinkContato(lead.contato);

  return (
    <div className="container">
      <div style={{ marginBottom: '16px' }}>
        <Link to="/leads" style={{ color: 'var(--muted-foreground)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          ← Voltar para todos os leads
        </Link>
      </div>

      {/* Cartão Principal de Informações */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className={`badge-status ${lead.status}`} style={{ marginBottom: '10px', display: 'inline-block' }}>
              Status: {lead.status}
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: 750, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>{lead.nome}</h1>
            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              {lead.servico} · <small>Canal: {lead.origem}</small>
              {lead.responsavel && (
                <span style={{ marginLeft: '8px', color: 'var(--foreground)', fontWeight: 600 }}>
                  · 👤 Responsável: {lead.responsavel}
                </span>
              )}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>VALOR ESTIMADO</div>
            <div style={{ fontSize: '22px', fontWeight: 750, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              {formatarMoeda(lead.valor_estimado)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          {lead.whatsapp && (
            <a
              href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '').length <= 11 ? `55${lead.whatsapp.replace(/\D/g, '')}` : lead.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="btn-acao primary"
              style={{ padding: '8px 14px' }}
            >
              💬 WhatsApp ({lead.whatsapp})
            </a>
          )}

          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              target="_blank"
              rel="noreferrer"
              className="btn-acao"
              style={{ padding: '8px 14px' }}
            >
              ✉️ E-mail ({lead.email})
            </a>
          )}

          {!lead.whatsapp && !lead.email && (
            <a
              href={contatoInfo.href}
              target="_blank"
              rel="noreferrer"
              className="btn-acao primary"
              style={{ padding: '8px 14px' }}
            >
              {contatoInfo.tipo === 'whatsapp' ? '💬 Iniciar WhatsApp' : '✉️ Enviar Mensagem'} ({contatoInfo.label})
            </a>
          )}

          <button
            className="btn-acao"
            style={{ fontWeight: 600 }}
            onClick={() => setModalEditarAberto(true)}
            title="Editar informações do lead"
          >
            ✏️ Editar Lead
          </button>

          {lead.status !== 'fechado' && lead.status !== 'perdido' && (
            <>
              <button className="btn-acao" onClick={() => handleAcaoRapida('contato')}>
                📞 Registrei contato
              </button>
              {lead.status === 'novo' && (
                <button className="btn-acao" onClick={() => handleAcaoRapida('orcamento')}>
                  📄 Enviei orçamento
                </button>
              )}
              <button className="btn-acao success" onClick={() => handleAcaoRapida('fechou')}>
                ✅ Fechou
              </button>
              <button className="btn-acao danger" onClick={() => setModalAcao({ aberto: true, tipo: 'perdeu' })}>
                ❌ Perdeu
              </button>
            </>
          )}

          <button className="btn-acao" onClick={() => setModalAcao({ aberto: true, tipo: 'nota' })}>
            📝 Nova nota
          </button>

          <button
            onClick={handleExcluir}
            className="btn-acao"
            style={{ marginLeft: 'auto', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
            title="Excluir lead definitivamente"
          >
            🗑️ Excluir
          </button>
        </div>
      </div>

      {/* Linha do Tempo de Interações */}
      <div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>
          Linha do Tempo ({lead.interacoes.length} {lead.interacoes.length === 1 ? 'registro' : 'registros'})
        </h3>

        {lead.interacoes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Nenhuma interação registrada ainda.</p>
        ) : (
          <div className="timeline">
            {lead.interacoes.map(it => (
              <div key={it.id} className="timeline-item">
                <div className="timeline-point" />
                <div className="timeline-header">
                  <span className="timeline-tipo" style={{
                    color: it.tipo === 'orcamento' ? 'var(--warning)' : it.tipo === 'contato' ? 'var(--primary)' : 'var(--text-muted)'
                  }}>
                    {it.tipo === 'orcamento' ? '📄 Orçamento' : it.tipo === 'contato' ? '📞 Contato' : it.tipo === 'follow_up' ? '🔄 Follow-up' : '📝 Nota'}
                  </span>
                  <span>{formatarDataHora(it.criado_em)}</span>
                </div>
                <div className="timeline-texto">
                  {it.texto}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalAcao
        aberto={modalAcao.aberto}
        tipo={modalAcao.tipo}
        leadId={lead.id}
        leadNome={lead.nome}
        onFechar={() => setModalAcao(prev => ({ ...prev, aberto: false }))}
        onSucesso={carregarLead}
      />

      <ModalEditarLead
        aberto={modalEditarAberto}
        lead={lead}
        onFechar={() => setModalEditarAberto(false)}
        onAtualizado={() => carregarLead()}
      />
    </div>
  );
};
