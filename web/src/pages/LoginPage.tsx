import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export const LoginPage: React.FC = () => {
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { login, hasUser } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!hasUser) {
      navigate('/setup');
    }
  }, [hasUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    try {
      setCarregando(true);
      await login(senha);
      navigate('/');
    } catch (err: any) {
      setErro(err.message || 'Senha incorreta');
    } finally {
      setCarregando(false);
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
        maxWidth: '400px',
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
          <h1 style={{ fontSize: '20px', fontWeight: 750, color: 'var(--foreground)', letterSpacing: '0.08em' }}>CheckLead</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
            Detector de vazamento de vendas
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
            <label className="form-label">Sua Senha de Acesso</label>
            <input
              type="password"
              className="form-input"
              placeholder="Digite sua senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn-acao primary"
            style={{ width: '100%', marginTop: '12px', padding: '12px', fontSize: '15px' }}
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Acessar Radar'}
          </button>
        </form>
      </div>
    </div>
  );
};
