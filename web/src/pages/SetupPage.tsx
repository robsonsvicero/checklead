import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { LoadingState } from '../components/FeedbackStates.js';

export const SetupPage: React.FC = () => {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { setup, provider, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState mensagem="Verificando autenticação..." />
      </div>
    );
  }

  if (provider === 'supabase') {
    return <Navigate to="/login" replace />;
  }

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
    <div className="auth-screen" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div className="auth-panel" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '32px 28px',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '12px' }}>
            <span className="brand-mark" style={{ width: '48px', height: '48px' }}>
              <span className="pulse-ring"></span>
              <img src="/favicon.svg" alt="CheckLEAD" style={{ width: '40px', height: '40px' }} />
            </span>
          </div>
          <h1 className="auth-title" style={{ fontSize: '20px', fontWeight: 750, letterSpacing: '0.04em' }}>CheckLEAD</h1>
          <p className="auth-subtitle" style={{ fontSize: '13px', marginTop: '4px' }}>
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
            <label className="form-label" htmlFor="setup-senha">Criar Senha de Acesso</label>
            <input
              id="setup-senha"
              type="password"
              className="form-input"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              autoComplete="new-password"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="setup-senha-confirmacao">Confirme a Senha</label>
            <input
              id="setup-senha-confirmacao"
              type="password"
              className="form-input"
              placeholder="Digite a mesma senha"
              value={confirmacao}
              onChange={e => setConfirmacao(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-acao primary"
            style={{ width: '100%', marginTop: '12px', padding: '12px', fontSize: '15px' }}
            disabled={salvando}
          >
            {salvando ? 'Configurando...' : 'Ativar Meu CheckLeads'}
          </button>
        </form>
      </div>
    </div>
  );
};
