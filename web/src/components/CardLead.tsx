import React from 'react';
import { Link } from 'react-router-dom';
import { Lead } from '@radar/shared';
import { formatarMoeda, formatarDataHora, gerarLinkContato } from '../utils/formatters.js';

interface CardLeadProps {
  lead: Lead;
  onAcaoRapida: (leadId: number, tipoAcao: 'contato' | 'orcamento' | 'fechou') => void;
  onAbrirModal: (tipo: 'perdeu' | 'nota', leadId: number, leadNome: string) => void;
  onEditar?: (lead: Lead) => void;
  onExcluir?: (leadId: number, leadNome: string) => void;
}

export const CardLead: React.FC<CardLeadProps> = ({
  lead,
  onAcaoRapida,
  onAbrirModal,
  onEditar,
  onExcluir
}) => {
  const whatsLink = lead.whatsapp ? gerarLinkContato(lead.whatsapp) : null;
  const emailLink = lead.email ? gerarLinkContato(lead.email) : null;
  const contatoFallback = !whatsLink && !emailLink ? gerarLinkContato(lead.contato) : null;

  const getStatusLabel = () => {
    switch (lead.status) {
      case 'novo': return 'Novo';
      case 'orcamento_enviado': return 'Orçado';
      case 'fechado': return 'Fechado';
      case 'perdido': return 'Perdido';
      default: return lead.status;
    }
  };

  return (
    <div className="lead-card">
      <div className="lead-header">
        <div>
          <Link to={`/leads/${lead.id}`} style={{ textDecoration: 'none' }}>
            <h3 className="lead-nome">{lead.nome}</h3>
          </Link>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {lead.servico} · <small>via {lead.origem}</small>
            {lead.responsavel && (
              <span style={{ marginLeft: '6px', color: '#475569', fontWeight: 600 }}>
                · 👤 {lead.responsavel}
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span className={`badge-status ${lead.status}`}>
            {getStatusLabel()}
          </span>
          <div style={{ fontWeight: 700, fontSize: '15px', marginTop: '4px', color: 'var(--text-main)' }}>
            {formatarMoeda(lead.valor_estimado)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0' }}>
        {whatsLink && (
          <a
            href={whatsLink.href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#059669',
              background: '#ecfdf5',
              padding: '2px 8px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            💬 WhatsApp: {whatsLink.label}
          </a>
        )}

        {emailLink && (
          <a
            href={emailLink.href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#0284c7',
              background: '#f0f9ff',
              padding: '2px 8px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            ✉️ E-mail: {emailLink.label}
          </a>
        )}

        {contatoFallback && (
          <a
            href={contatoFallback.href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#0284c7',
              background: '#f0f9ff',
              padding: '2px 8px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            {contatoFallback.tipo === 'whatsapp' ? '💬' : '✉️'} {contatoFallback.label}
          </a>
        )}

        <span>Entrou em: {formatarDataHora(lead.criado_em)}</span>

        {lead.motivo_perda && (
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
            Perda: {lead.motivo_perda}
          </span>
        )}
      </div>

      <div className="acoes-grid">
        {lead.status !== 'fechado' && lead.status !== 'perdido' && (
          <>
            <button
              className="btn-acao primary"
              onClick={() => onAcaoRapida(lead.id, 'contato')}
              title="Registrar contato agora"
            >
              📞 Falei
            </button>

            {lead.status === 'novo' && (
              <button
                className="btn-acao"
                onClick={() => onAcaoRapida(lead.id, 'orcamento')}
                title="Marcar que orçamento foi enviado"
              >
                📄 Enviei orçamento
              </button>
            )}

            <button
              className="btn-acao success"
              onClick={() => onAcaoRapida(lead.id, 'fechou')}
              title="Marcar como fechado"
            >
              ✅ Fechou
            </button>

            <button
              className="btn-acao danger"
              onClick={() => onAbrirModal('perdeu', lead.id, lead.nome)}
              title="Marcar como perdido"
            >
              ❌ Perdeu
            </button>
          </>
        )}

        <button
          className="btn-acao"
          onClick={() => onAbrirModal('nota', lead.id, lead.nome)}
          title="Adicionar anotação"
        >
          📝 Nota
        </button>

        {onEditar && (
          <button
            className="btn-acao"
            onClick={() => onEditar(lead)}
            title="Editar informações do lead"
          >
            ✏️ Editar
          </button>
        )}

        {onExcluir && (
          <button
            className="btn-acao"
            style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
            onClick={() => onExcluir(lead.id, lead.nome)}
            title="Excluir este lead"
          >
            🗑️ Excluir
          </button>
        )}

        <Link
          to={`/leads/${lead.id}`}
          className="btn-acao"
          style={{ marginLeft: 'auto', background: 'transparent' }}
        >
          Detalhes →
        </Link>
      </div>
    </div>
  );
};
