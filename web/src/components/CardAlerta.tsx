import React from 'react';
import { Link } from 'react-router-dom';
import { AlertaLead } from '@radar/shared';
import { formatarMoeda, gerarLinkContato } from '../utils/formatters.js';

interface CardAlertaProps {
  alerta: AlertaLead;
  onAcaoRapida: (leadId: number, tipoAcao: TipoAcaoRapida) => void;
  onAbrirModal: (tipo: 'perdeu' | 'nota', leadId: number, leadNome: string) => void;
  acaoRapidaDesabilitada: boolean;
  tipoAcaoEmAndamento: TipoAcaoRapida | null;
  onEditar?: (leadId: number) => void;
  onExcluir?: (leadId: number, leadNome: string) => void;
}

export type TipoAcaoRapida = 'contato' | 'orcamento' | 'fechou';

export const CardAlerta: React.FC<CardAlertaProps> = ({
  alerta,
  onAcaoRapida,
  onAbrirModal,
  acaoRapidaDesabilitada,
  tipoAcaoEmAndamento,
  onEditar,
  onExcluir
}) => {
  const [menuAberto, setMenuAberto] = React.useState(false);
  const detailsRef = React.useRef<HTMLDetailsElement>(null);

  React.useEffect(() => {
    if (!menuAberto) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.removeAttribute('open');
        setMenuAberto(false);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [menuAberto]);

  const whatsLink = alerta.lead_whatsapp ? gerarLinkContato(alerta.lead_whatsapp) : null;
  const emailLink = alerta.lead_email ? gerarLinkContato(alerta.lead_email) : null;
  const contatoFallback = !whatsLink && !emailLink ? gerarLinkContato(alerta.lead_contato) : null;

  return (
    <div className={`alerta-card ${menuAberto ? 'menu-aberto' : ''}`}>
      <div className="alerta-header">
        <div className="alerta-titulo-grupo">
          <Link to={`/leads/${alerta.lead_id}`} style={{ textDecoration: 'none' }}>
            <h3 className="alerta-nome">{alerta.lead_nome}</h3>
          </Link>
          <div className="alerta-servico">
            {alerta.lead_servico} · <small className="alerta-origem">via {alerta.origem}</small>
            {alerta.lead_responsavel && (
              <span className="alerta-responsavel">
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
            className="alerta-contato-link whatsapp"
          >
            💬 WhatsApp: {whatsLink.label}
          </a>
        )}

        {emailLink && (
          <a
            href={emailLink.href}
            target="_blank"
            rel="noreferrer"
            className="alerta-contato-link email"
          >
            ✉️ E-mail: {emailLink.label}
          </a>
        )}

        {contatoFallback && (
          <a
            href={contatoFallback.href}
            target="_blank"
            rel="noreferrer"
            className={`alerta-contato-link ${contatoFallback.tipo === 'whatsapp' ? 'whatsapp' : 'email'}`}
          >
            {contatoFallback.tipo === 'whatsapp' ? '💬 WhatsApp' : '✉️ Contato'}: {contatoFallback.label}
          </a>
        )}
      </div>

      <div className="acoes-grid">
        <button
          className="btn-acao primary"
          onClick={() => onAcaoRapida(alerta.lead_id, 'contato')}
          disabled={acaoRapidaDesabilitada}
          aria-busy={tipoAcaoEmAndamento === 'contato'}
          title="Registrar que você entrou em contato agora"
        >
          {tipoAcaoEmAndamento === 'contato' ? 'Registrando...' : 'Falei com ele'}
        </button>

        <details
          ref={detailsRef}
          className="acoes-secundarias"
          onToggle={e => setMenuAberto((e.target as HTMLDetailsElement).open)}
        >
          <summary className="btn-acao">Mais ações</summary>
          <div className="acoes-menu" onClick={event => event.currentTarget.parentElement?.removeAttribute('open')}>
            {alerta.status === 'novo' && (
              <button
                className="btn-acao"
                onClick={() => onAcaoRapida(alerta.lead_id, 'orcamento')}
                disabled={acaoRapidaDesabilitada}
                aria-busy={tipoAcaoEmAndamento === 'orcamento'}
                title="Marcar que orçamento foi enviado"
              >
                {tipoAcaoEmAndamento === 'orcamento' ? 'Registrando...' : '📄 Enviei orçamento'}
              </button>
            )}

            {alerta.status !== 'fechado' && alerta.status !== 'perdido' && (
              <>
                <button
                  className="btn-acao success"
                  onClick={() => onAcaoRapida(alerta.lead_id, 'fechou')}
                  disabled={acaoRapidaDesabilitada}
                  aria-busy={tipoAcaoEmAndamento === 'fechou'}
                  title="Marcar como fechado"
                >
                  {tipoAcaoEmAndamento === 'fechou' ? 'Registrando...' : '✅ Fechou'}
                </button>

                <button
                  className="btn-acao danger"
                  onClick={() => onAbrirModal('perdeu', alerta.lead_id, alerta.lead_nome)}
                  disabled={acaoRapidaDesabilitada}
                  title="Marcar como perdido"
                >
                  ❌ Perdeu
                </button>
              </>
            )}

            <button
              className="btn-acao"
              onClick={() => onAbrirModal('nota', alerta.lead_id, alerta.lead_nome)}
              disabled={acaoRapidaDesabilitada}
              title="Adicionar anotação"
            >
              📝 Nota
            </button>

            {onEditar && (
              <button
                className="btn-acao"
                onClick={() => onEditar(alerta.lead_id)}
                disabled={acaoRapidaDesabilitada}
                title="Editar informações do lead"
              >
                ✏️ Editar
              </button>
            )}

            {onExcluir && (
              <button
                className="btn-acao danger"
                onClick={() => onExcluir(alerta.lead_id, alerta.lead_nome)}
                disabled={acaoRapidaDesabilitada}
                title="Excluir este lead"
              >
                🗑️ Excluir
              </button>
            )}
          </div>
        </details>

        <Link
          to={`/leads/${alerta.lead_id}`}
          className="btn-acao alerta-historico"
        >
          Ver histórico
        </Link>
      </div>
    </div>
  );
};
