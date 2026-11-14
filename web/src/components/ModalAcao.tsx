import React, { useState } from 'react';
import { apiFetch } from '../api/client.js';

interface ModalAcaoProps {
  aberto: boolean;
  tipo: 'perdeu' | 'nota';
  leadId: number;
  leadNome: string;
  onFechar: () => void;
  onSucesso: () => void;
}

export const ModalAcao: React.FC<ModalAcaoProps> = ({
  aberto,
  tipo,
  leadId,
  leadNome,
  onFechar,
  onSucesso
}) => {
  const [motivo, setMotivo] = useState('');
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (tipo === 'perdeu' && !motivo.trim()) {
      setErro('Por favor, informe o motivo da perda.');
      return;
    }

    if (tipo === 'nota' && !texto.trim()) {
      setErro('Por favor, digite o conteúdo da nota.');
      return;
    }

    try {
      setSalvando(true);
      await apiFetch(`/leads/${leadId}/acoes`, {
        method: 'POST',
        body: JSON.stringify(
          tipo === 'perdeu'
            ? { tipo: 'perdeu', motivo_perda: motivo.trim(), texto: texto.trim() || undefined }
            : { tipo: 'nota', texto: texto.trim() }
        )
      });

      setMotivo('');
      setTexto('');
      onSucesso();
      onFechar();
    } catch (err: any) {
      setErro(err.message || 'Falha ao registrar ação');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {tipo === 'perdeu' ? `❌ Marcar perda: ${leadNome}` : `📝 Adicionar nota: ${leadNome}`}
          </h3>
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
          {tipo === 'perdeu' ? (
            <>
              <div className="form-group">
                <label className="form-label">Qual foi o motivo da perda? *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Achou caro, sumiu, fechou com concorrente..."
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Comentário adicional (opcional)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Detalhes ou aprendizado sobre essa oportunidade..."
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">Anotação rápida *</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Ex: Cliente pediu para ligar quinta-feira às 14h..."
                value={texto}
                onChange={e => setTexto(e.target.value)}
                required
                autoFocus
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
              className={`btn-acao ${tipo === 'perdeu' ? 'danger' : 'primary'}`}
              style={{ flex: 2 }}
              disabled={salvando}
            >
              {salvando ? 'Salvando...' : tipo === 'perdeu' ? 'Confirmar Perda' : 'Salvar Nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
