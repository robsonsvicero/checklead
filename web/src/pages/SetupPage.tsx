import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export const SetupPage: React.FC = () => {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { setup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmacao) {
      setErro('As senhas digitadas não coincidem.');
      return;
    }

    try {
      setSalvando(true);
      await setup(senha);
      navigate('/');
    } catch (err: any) {
      setErro(err.message || 'Falha ao configurar senha');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      background: 'var(--background)'
    }}>
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        width: '100%',
        maxWidth: '440px',
        padding: '32px 28px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 4px 24px rgba(37,45,61,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '12px' }}>
            <span className="brand-mark" style={{ width: '48px', height: '48px' }}>
              <span className="pulse-ring"></span>
              <img src="/favicon.svg" alt="CheckLead" style={{ width: '40px', height: '40px' }} />
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 750, color: 'var(--foreground)', letterSpacing: '0.04em' }}>CheckLead</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
            Defina uma senha mestre para proteger seus dados locais.
          </p>
        </div>

        {erro && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Criar Senha de Acesso</label>
            <input
              type="password"
              className="form-input"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirme a Senha</label>
            <input
              type="password"
              className="form-input"
              placeholder="Digite a mesma senha"
              value={confirmacao}
              onChange={e => setConfirmacao(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-acao primary"
            style={{ width: '100%', marginTop: '12px', padding: '12px', fontSize: '15px' }}
            disabled={salvando}
          >
            {salvando ? 'Configurando...' : 'Ativar Meu Radar de Leads'}
          </button>
        </form>
      </div>
    </div>
  );
};
