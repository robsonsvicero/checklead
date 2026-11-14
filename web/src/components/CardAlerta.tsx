import React from 'react';
import { Link } from 'react-router-dom';
import { AlertaLead } from '@radar/shared';
import { formatarMoeda, gerarLinkContato } from '../utils/formatters.js';

interface CardAlertaProps {
  alerta: AlertaLead;
  onAcaoRapida: (leadId: number, tipoAcao: 'contato' | 'orcamento' | 'fechou') => void;
  onAbrirModal: (tipo: 'perdeu' | 'nota', leadId: number, leadNome: string) => void;
}

export const CardAlerta: React.FC<CardAlertaProps> = ({
  alerta,
  onAcaoRapida,
  onAbrirModal
}) => {
  const whatsLink = alerta.lead_whatsapp ? gerarLinkContato(alerta.lead_whatsapp) : null;
  const emailLink = alerta.lead_email ? gerarLinkContato(alerta.lead_email) : null;
  const contatoFallback = !whatsLink && !emailLink ? gerarLinkContato(alerta.lead_contato) : null;

  return (
    <div className="alerta-card">
      <div className="alerta-header">
        <div className="alerta-titulo-grupo">
          <Link to={`/leads/${alerta.lead_id}`} style={{ textDecoration: 'none' }}>
            <h3 className="alerta-nome">{alerta.lead_nome}</h3>
          </Link>
          <div className="alerta-servico">
            {alerta.lead_servico} · <small style={{ color: '#b45309' }}>via {alerta.origem}</small>
            {alerta.lead_responsavel && (
              <span style={{ marginLeft: '6px', color: '#92400e', fontWeight: 600 }}>
                · 👤 {alerta.lead_responsavel}
              </span>
            )}
          </div>
        </div>
        <div className="alerta-valor-tag" title="Valor estimado em risco de ser perdido">
          {formatarMoeda(alerta.valor_em_risco)} em risco
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', margin: '6px 0 10px' }}>
        <span className="alerta-motivo">
          ⚠️ {alerta.descricao}
        </span>

        {whatsLink && (
          <a
            href={whatsLink.href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              color: '#059669',
              background: '#ecfdf5',
              padding: '3px 8px',
              borderRadius: '4px',
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
              gap: '4px',
              fontSize: '13px',
              color: '#0369a1',
              background: '#e0f2fe',
              padding: '3px 8px',
              borderRadius: '4px',
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
              gap: '4px',
              fontSize: '13px',
              color: '#0369a1',
              background: '#e0f2fe',
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 600
            }}
          >
            {contatoFallback.tipo === 'whatsapp' ? '💬 WhatsApp' : '✉️ Contato'}: {contatoFallback.label}
          </a>
        )}
      </div>

      <div className="acoes-grid">
        <button
          className="btn-acao primary"
          onClick={() => onAcaoRapida(alerta.lead_id, 'contato')}
          title="Registrar que você entrou em contato agora"
        >
          📞 Falei com ele
        </button>

        {alerta.status === 'novo' && (
          <button
            className="btn-acao"
            onClick={() => onAcaoRapida(alerta.lead_id, 'orcamento')}
            title="Marcar orçamento enviado"
          >
            📄 Enviei orçamento
          </button>
        )}

        <button
          className="btn-acao success"
          onClick={() => onAcaoRapida(alerta.lead_id, 'fechou')}
          title="Comemorar e fechar a venda!"
        >
          ✅ Fechou
        </button>

        <button
          className="btn-acao danger"
          onClick={() => onAbrirModal('perdeu', alerta.lead_id, alerta.lead_nome)}
          title="Registrar perda e motivo"
        >
          ❌ Perdeu
        </button>

        <button
          className="btn-acao"
          onClick={() => onAbrirModal('nota', alerta.lead_id, alerta.lead_nome)}
          title="Adicionar anotação"
        >
          📝 Nota
        </button>

        <Link
          to={`/leads/${alerta.lead_id}`}
          className="btn-acao"
          style={{ marginLeft: 'auto', background: 'transparent' }}
        >
          Ver histórico →
        </Link>
      </div>
    </div>
  );
};
