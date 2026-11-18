import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import { parseMoedaParaCentavos } from '../utils/formatters.js';
import { Lead, LeadOrigem, LeadStatus } from '@radar/shared';

interface ModalEditarLeadProps {
  aberto: boolean;
  lead: Lead | null;
  onFechar: () => void;
  onAtualizado: (leadAtualizado: Lead) => void;
}

export const ModalEditarLead: React.FC<ModalEditarLeadProps> = ({
  aberto,
  lead,
  onFechar,
  onAtualizado
}) => {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [googleMeuNegocio, setGoogleMeuNegocio] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [servico, setServico] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [origem, setOrigem] = useState<LeadOrigem>('Instagram');
  const [status, setStatus] = useState<LeadStatus>('novo');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setNome(lead.nome);
      setWhatsapp(lead.whatsapp || (lead.contato.includes('@') ? '' : lead.contato));
      setEmail(lead.email || (lead.contato.includes('@') ? lead.contato : ''));
      setInstagram(lead.instagram ? `@${lead.instagram.replace(/^@/, '')}` : '');
      setGoogleMeuNegocio(lead.google_meu_negocio || '');
      setResponsavel(lead.responsavel || '');
      setServico(lead.servico);
      setValorTexto((lead.valor_estimado / 100).toFixed(2).replace('.', ','));
      setOrigem(lead.origem);
      setStatus(lead.status);
      setMotivoPerda(lead.motivo_perda || '');
    }
  }, [lead]);

  if (!aberto || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const whatsLimpo = whatsapp.trim();
    const emailLimpo = email.trim();

    if (!nome.trim() || !servico.trim()) {
      setErro('Preencha o nome do cliente e o serviço.');
      return;
    }

    if (!whatsLimpo && !emailLimpo) {
      setErro('Informe pelo menos um meio de contato (WhatsApp ou E-mail).');
      return;
    }

    if (status === 'perdido' && !motivoPerda.trim()) {
      setErro('Informe o motivo da perda.');
      return;
    }

    const valorCentavos = parseMoedaParaCentavos(valorTexto);

    try {
      setSalvando(true);
      const leadAtualizado = await apiFetch<Lead>(`/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsLimpo || null,
          email: emailLimpo || null,
          instagram: instagram.trim().replace(/^@/, '') || null,
          google_meu_negocio: googleMeuNegocio.trim() || null,
          contato: whatsLimpo || emailLimpo,
          responsavel: responsavel.trim() || null,
          servico: servico.trim(),
          origem,
          valor_estimado: valorCentavos,
          status,
          motivo_perda: status === 'perdido' ? motivoPerda.trim() : null
        })
      });

      onAtualizado(leadAtualizado);
      onFechar();
    } catch (err: any) {
      setErro(err.message || 'Falha ao atualizar lead');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="editar-lead-titulo" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="editar-lead-titulo">✏️ Editar Lead</h2>
          <button className="btn-close" onClick={onFechar}>&times;</button>
        </div>

        {erro && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '14px'
          }} role="alert">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="modal-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="editar-lead-nome">Nome do Cliente *</label>
              <input
                id="editar-lead-nome"
                type="text"
                className="form-input"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="editar-lead-responsavel">Responsável pelo Lead</label>
              <input
                id="editar-lead-responsavel"
                type="text"
                className="form-input"
                placeholder="Ex: Robson, Mariana..."
                value={responsavel}
                onChange={e => setResponsavel(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="editar-lead-whatsapp">WhatsApp</label>
              <input
                id="editar-lead-whatsapp"
                type="text"
                className="form-input"
                placeholder="(11) 98888-7777"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="editar-lead-email">E-mail</label>
              <input
                id="editar-lead-email"
                type="email"
                className="form-input"
                placeholder="cliente@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="editar-lead-instagram">Instagram</label>
              <input
                id="editar-lead-instagram"
                type="text"
                className="form-input"
                placeholder="@usuario"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="editar-lead-google-meu-negocio">Google Meu Negócio</label>
              <input
                id="editar-lead-google-meu-negocio"
                type="url"
                className="form-input"
                placeholder="https://maps.app.goo.gl/..."
                value={googleMeuNegocio}
                onChange={e => setGoogleMeuNegocio(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="editar-lead-servico">Serviço *</label>
            <input
              id="editar-lead-servico"
              type="text"
              className="form-input"
              value={servico}
              onChange={e => setServico(e.target.value)}
              required
            />
          </div>

          <div className="modal-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="editar-lead-valor">Valor Estimado (R$)</label>
              <input
                id="editar-lead-valor"
                type="text"
                className="form-input"
                value={valorTexto}
                onChange={e => setValorTexto(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="editar-lead-origem">Origem</label>
              <select
                id="editar-lead-origem"
                className="form-select"
                value={origem}
                onChange={e => setOrigem(e.target.value as LeadOrigem)}
              >
                <option value="Instagram">Instagram</option>
                <option value="indicação">Indicação</option>
                <option value="site">Site</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="editar-lead-status">Status da Oportunidade</label>
            <select
              id="editar-lead-status"
              className="form-select"
              value={status}
              onChange={e => setStatus(e.target.value as LeadStatus)}
            >
              <option value="novo">Novo</option>
              <option value="orcamento_enviado">Orçamento Enviado</option>
              <option value="standby">Standby (Em espera)</option>
              <option value="fechado">Fechado (Ganho)</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>

          {status === 'perdido' && (
            <div className="form-group">
              <label className="form-label" htmlFor="editar-lead-motivo-perda">Motivo da Perda *</label>
              <input
                id="editar-lead-motivo-perda"
                type="text"
                className="form-input"
                placeholder="Ex: Achou caro, fechou com concorrente..."
                value={motivoPerda}
                onChange={e => setMotivoPerda(e.target.value)}
                required
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn-acao"
              style={{ flex: 1 }}
              onClick={onFechar}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-acao primary"
              style={{ flex: 2 }}
              disabled={salvando}
            >
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
