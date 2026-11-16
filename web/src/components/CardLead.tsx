import React from 'react';
import { Link } from 'react-router-dom';
import { Lead } from '@radar/shared';
import { formatarMoeda, formatarDataHora, formatarStatusLead, gerarLinkContato } from '../utils/formatters.js';

interface CardLeadProps {
  lead: Lead;
  onAcaoRapida: (leadId: number, tipoAcao: 'contato' | 'orcamento' | 'fechou') => void;
  acaoEmAndamento: { leadId: number; tipoAcao: 'contato' | 'orcamento' | 'fechou' } | null;
  onAbrirModal: (tipo: 'perdeu' | 'nota', leadId: number, leadNome: string) => void;
  onEditar?: (lead: Lead) => void;
  onExcluir?: (leadId: number, leadNome: string) => void;
}

export const CardLead: React.FC<CardLeadProps> = ({
  lead,
  onAcaoRapida,
  acaoEmAndamento,
  onAbrirModal,
  onEditar,
  onExcluir
}) => {
  const whatsLink = lead.whatsapp ? gerarLinkContato(lead.whatsapp) : null;
  const emailLink = lead.email ? gerarLinkContato(lead.email) : null;
  const contatoFallback = !whatsLink && !emailLink ? gerarLinkContato(lead.contato) : null;
  const instagramHandle = lead.instagram?.replace(/^@/, '');
  const instagramUrl = instagramHandle
    ? `https://www.instagram.com/${encodeURIComponent(instagramHandle)}/`
    : null;
  const googleMeuNegocioUrl = getHttpUrl(lead.google_meu_negocio);

  return (
    <div className="lead-card">
      <div className="lead-header">
        <div className="lead-header-main">
          <div className="lead-title-row">
            <Link to={`/leads/${lead.id}`} style={{ textDecoration: 'none' }}>
              <h3 className="lead-nome">{lead.nome}</h3>
            </Link>
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="lead-social-link">
                @{instagramHandle}
              </a>
            )}
            {googleMeuNegocioUrl && (
              <a href={googleMeuNegocioUrl} target="_blank" rel="noopener noreferrer" className="lead-social-link">
                Google Meu Negócio
              </a>
            )}
          </div>
          <div className="lead-descricao">
            {lead.servico} · <small>via {lead.origem}</small>
            {lead.responsavel && (
              <span className="lead-responsavel">
                · 👤 {lead.responsavel}
              </span>
            )}
          </div>
        </div>

        <div className="lead-header-meta">
          <span className={`badge-status ${lead.status}`}>
            {formatarStatusLead(lead.status)}
          </span>
          <div className="lead-valor">
            {formatarMoeda(lead.valor_estimado)}
          </div>
        </div>
      </div>

      <div className="lead-details">
        {whatsLink && (
          <a
            href={whatsLink.href}
            target="_blank"
            rel="noreferrer"
            className="lead-contact-link whatsapp"
          >
            💬 WhatsApp: {whatsLink.label}
          </a>
        )}

        {emailLink && (
          <a
            href={emailLink.href}
            target="_blank"
            rel="noreferrer"
            className="lead-contact-link email"
          >
            ✉️ E-mail: {emailLink.label}
          </a>
        )}

        {contatoFallback && (
          <a
            href={contatoFallback.href}
            target="_blank"
            rel="noreferrer"
            className={`lead-contact-link ${contatoFallback.tipo === 'whatsapp' ? 'whatsapp' : 'email'}`}
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
          <button
            className="btn-acao primary"
            onClick={() => onAcaoRapida(lead.id, 'contato')}
            disabled={acaoEmAndamento !== null}
            aria-busy={acaoEmAndamento?.leadId === lead.id && acaoEmAndamento.tipoAcao === 'contato'}
            title="Registrar contato agora"
          >
            {acaoEmAndamento?.leadId === lead.id && acaoEmAndamento.tipoAcao === 'contato' ? 'Registrando...' : '📞 Falei'}
          </button>
        )}

        <details className="acoes-secundarias">
          <summary className="btn-acao">Mais ações</summary>
          <div className="acoes-menu" onClick={event => event.currentTarget.parentElement?.removeAttribute('open')}>
            {lead.status === 'novo' && (
              <button
                className="btn-acao"
                onClick={() => onAcaoRapida(lead.id, 'orcamento')}
                disabled={acaoEmAndamento !== null}
                aria-busy={acaoEmAndamento?.leadId === lead.id && acaoEmAndamento.tipoAcao === 'orcamento'}
                title="Marcar que orçamento foi enviado"
              >
                {acaoEmAndamento?.leadId === lead.id && acaoEmAndamento.tipoAcao === 'orcamento' ? 'Registrando...' : '📄 Enviei orçamento'}
              </button>
            )}

            {lead.status !== 'fechado' && lead.status !== 'perdido' && (
              <>
                <button
                  className="btn-acao success"
                  onClick={() => onAcaoRapida(lead.id, 'fechou')}
                  disabled={acaoEmAndamento !== null}
                  aria-busy={acaoEmAndamento?.leadId === lead.id && acaoEmAndamento.tipoAcao === 'fechou'}
                  title="Marcar como fechado"
                >
                  {acaoEmAndamento?.leadId === lead.id && acaoEmAndamento.tipoAcao === 'fechou' ? 'Registrando...' : '✅ Fechou'}
                </button>
                <button
                  className="btn-acao danger"
                  onClick={() => onAbrirModal('perdeu', lead.id, lead.nome)}
                  disabled={acaoEmAndamento !== null}
                  title="Marcar como perdido"
                >
                  ❌ Perdeu
                </button>
              </>
            )}

            <button
              className="btn-acao"
              onClick={() => onAbrirModal('nota', lead.id, lead.nome)}
              disabled={acaoEmAndamento !== null}
              title="Adicionar anotação"
            >
              📝 Nota
            </button>

            {onEditar && (
              <button
                className="btn-acao"
                onClick={() => onEditar(lead)}
                disabled={acaoEmAndamento !== null}
                title="Editar informações do lead"
              >
                ✏️ Editar
              </button>
            )}

            {onExcluir && (
              <button
                className="btn-acao danger"
                onClick={() => onExcluir(lead.id, lead.nome)}
                disabled={acaoEmAndamento !== null}
                title="Excluir este lead"
              >
                🗑️ Excluir
              </button>
            )}
          </div>
        </details>

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

function getHttpUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
