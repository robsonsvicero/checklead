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
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">⚡ Novo Lead Rápido</h2>
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
          }}>
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Nome do Cliente *</label>
              <input
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
              <label className="form-label">Responsável pelo Lead</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Robson, Mariana..."
                value={responsavel}
                onChange={e => setResponsavel(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: (11) 98888-7777"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="form-input"
                placeholder="Ex: cliente@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '11px', marginTop: '-8px', marginBottom: '12px' }}>
            * Preencha pelo menos um: WhatsApp ou E-mail.
          </small>

          <div className="form-group">
            <label className="form-label">Serviço Desejado *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Consultoria, Projeto, Reforma..."
              value={servico}
              onChange={e => setServico(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Valor Estimado (R$)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: 1500,00"
                value={valorTexto}
                onChange={e => setValorTexto(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Origem do Lead</label>
              <select
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
