import React, { useState } from 'react';
import { apiFetch } from '../api/client.js';
import { parseMoedaParaCentavos } from '../utils/formatters.js';
import { Lead, LeadOrigem } from '@radar/shared';

interface ModalNovoLeadProps {
  aberto: boolean;
  onFechar: () => void;
  onCriado: (novoLead: Lead) => void;
}

export const ModalNovoLead: React.FC<ModalNovoLeadProps> = ({ aberto, onFechar, onCriado }) => {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [googleMeuNegocio, setGoogleMeuNegocio] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [servico, setServico] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [origem, setOrigem] = useState<LeadOrigem>('Instagram');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

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

    const valorCentavos = parseMoedaParaCentavos(valorTexto);

    try {
      setSalvando(true);
      const novoLead = await apiFetch<Lead>('/leads', {
        method: 'POST',
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
          valor_estimado: valorCentavos
        })
      });

      // Reseta formulário e fecha
      setNome('');
      setWhatsapp('');
      setEmail('');
      setInstagram('');
      setGoogleMeuNegocio('');
      setResponsavel('');
      setServico('');
      setValorTexto('');
      setOrigem('Instagram');
      onCriado(novoLead);
      onFechar();
    } catch (err: any) {
      setErro(err.message || 'Falha ao salvar lead');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="novo-lead-titulo" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="novo-lead-titulo">⚡ Novo Lead Rápido</h2>
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
              <label className="form-label" htmlFor="novo-lead-nome">Nome do Cliente *</label>
              <input
                id="novo-lead-nome"
                type="text"
                className="form-input"
                placeholder="Ex: Carlos Silva"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="novo-lead-responsavel">Responsável pelo Lead</label>
              <input
                id="novo-lead-responsavel"
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
              <label className="form-label" htmlFor="novo-lead-whatsapp">WhatsApp</label>
              <input
                id="novo-lead-whatsapp"
                type="text"
                className="form-input"
                placeholder="Ex: (11) 98888-7777"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                aria-describedby="novo-lead-contato-ajuda"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="novo-lead-email">E-mail</label>
              <input
                id="novo-lead-email"
                type="email"
                className="form-input"
                placeholder="Ex: cliente@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-describedby="novo-lead-contato-ajuda"
              />
            </div>
          </div>
          <small id="novo-lead-contato-ajuda" style={{ display: 'block', color: 'var(--text-muted)', fontSize: '11px', marginTop: '-8px', marginBottom: '12px' }}>
            * Preencha pelo menos um: WhatsApp ou E-mail.
          </small>

          <div className="modal-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="novo-lead-instagram">Instagram</label>
              <input
                id="novo-lead-instagram"
                type="text"
                className="form-input"
                placeholder="@usuario"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="novo-lead-google-meu-negocio">Google Meu Negócio</label>
              <input
                id="novo-lead-google-meu-negocio"
                type="url"
                className="form-input"
                placeholder="https://maps.app.goo.gl/..."
                value={googleMeuNegocio}
                onChange={e => setGoogleMeuNegocio(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="novo-lead-servico">Serviço Desejado *</label>
            <input
              id="novo-lead-servico"
              type="text"
              className="form-input"
              placeholder="Ex: Consultoria, Projeto, Reforma..."
              value={servico}
              onChange={e => setServico(e.target.value)}
              required
            />
          </div>

          <div className="modal-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="novo-lead-valor">Valor Estimado (R$)</label>
              <input
                id="novo-lead-valor"
                type="text"
                className="form-input"
                placeholder="Ex: 1500,00"
                value={valorTexto}
                onChange={e => setValorTexto(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="novo-lead-origem">Origem do Lead</label>
              <select
                id="novo-lead-origem"
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
              {salvando ? 'Salvando...' : 'Salvar Lead (< 20s)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
