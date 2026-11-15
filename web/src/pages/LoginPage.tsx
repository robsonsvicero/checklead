import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';

interface InvitationTokens {
  accessToken: string;
  refreshToken: string;
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [invitationTokens, setInvitationTokens] = useState<InvitationTokens | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { login, hasUser, provider, authenticated, loading: authLoading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isInvitation = location.search.includes('convite=1') || invitationTokens !== null;

  useEffect(() => {
    if (!authLoading && provider === 'sqlite' && !hasUser) {
      navigate('/setup', { replace: true });
    } else if (!authLoading && authenticated && !isInvitation) {
      navigate('/', { replace: true });
    }
  }, [authLoading, authenticated, hasUser, isInvitation, navigate, provider]);

  useEffect(() => {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (type === 'invite' && accessToken && refreshToken) {
      setInvitationTokens({ accessToken, refreshToken });
      setErro(null);
      window.history.replaceState(null, '', `${location.pathname}${location.search}`);
    } else if (location.search.includes('convite=1')) {
      setErro('Este link de convite expirou ou já foi usado. Peça ao administrador para enviar outro convite.');
    }
  }, [location.hash, location.pathname, location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (isInvitation && !invitationTokens) {
      setErro('Abra o link recebido por e-mail para aceitar o convite.');
      return;
    }
    if (isInvitation && senha !== confirmacaoSenha) {
      setErro('A confirmação da senha não confere.');
      return;
    }
    if (isInvitation && senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    try {
      setCarregando(true);
      if (isInvitation && invitationTokens) {
        await apiFetch('/auth/accept-invitation', {
          method: 'POST',
          body: JSON.stringify({ ...invitationTokens, novaSenha: senha })
        });
        await checkAuth();
      } else {
        await login({ email: provider === 'supabase' ? email : undefined, senha });
      }
      navigate('/', { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir o acesso.');
    } finally {
      setCarregando(false);
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
        maxWidth: '400px',
        padding: '32px 28px',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', marginBottom: '12px' }}>
            <span className="brand-mark" style={{ width: '48px', height: '48px' }}>
              <span className="pulse-ring"></span>
              <img src="/favicon.svg" alt="CheckLead" style={{ width: '40px', height: '40px' }} />
            </span>
          </div>
          <h1 className="auth-title" style={{ fontSize: '20px', fontWeight: 750, letterSpacing: '0.08em' }}>CheckLead</h1>
          <p className="auth-subtitle" style={{ fontSize: '13px', marginTop: '4px' }}>
            {isInvitation ? 'Ative seu acesso ao CheckLead' : 'Detector de vazamento de vendas'}
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
          }} role="alert">
            {erro}
          </div>
        )}

        {isInvitation && !invitationTokens ? (
          <button
            type="button"
            className="btn-acao"
            style={{ width: '100%' }}
            onClick={() => navigate('/login', { replace: true })}
          >
            Voltar para o login
          </button>
        ) : (
          <form onSubmit={handleSubmit}>
            {!isInvitation && provider === 'supabase' && (
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">E-mail</label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="login-senha">
                {isInvitation ? 'Crie uma senha (mínimo 8 caracteres)' : 'Sua Senha de Acesso'}
              </label>
              <input
                id="login-senha"
                type="password"
                className="form-input"
                placeholder={isInvitation ? 'Crie uma senha segura' : 'Digite sua senha'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                autoComplete={isInvitation ? 'new-password' : 'current-password'}
                required
                autoFocus={provider === 'sqlite' || isInvitation}
              />
            </div>

            {isInvitation && (
              <div className="form-group">
                <label className="form-label" htmlFor="confirmacao-senha">Confirme a senha</label>
                <input
                  id="confirmacao-senha"
                  type="password"
                  className="form-input"
                  placeholder="Digite a mesma senha"
                  value={confirmacaoSenha}
                  onChange={e => setConfirmacaoSenha(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            {provider === 'supabase' && !isInvitation && (
              <p className="auth-subtitle" style={{ fontSize: '12px', marginTop: '-4px' }}>
                O acesso é feito por convite do administrador.
              </p>
            )}

            <button
              type="submit"
              className="btn-acao primary"
              style={{ width: '100%', marginTop: '12px', padding: '12px', fontSize: '15px' }}
              disabled={carregando || authLoading}
            >
              {carregando ? 'Aguarde...' : isInvitation ? 'Ativar minha conta' : provider === 'supabase' ? 'Entrar' : 'Acessar Radar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
