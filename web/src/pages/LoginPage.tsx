import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';

interface EmailActionTokens {
  accessToken: string;
  refreshToken: string;
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacaoSenha, setMostrarConfirmacaoSenha] = useState(false);
  const [invitationTokens, setInvitationTokens] = useState<EmailActionTokens | null>(null);
  const [recoveryTokens, setRecoveryTokens] = useState<EmailActionTokens | null>(null);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);
  const [solicitarRedefinicaoSenha, setSolicitarRedefinicaoSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const { login, hasUser, provider, authenticated, loading: authLoading, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(location.search);
  const hashType = hashParams.get('type') || searchParams.get('type');
  const hasAuthCallbackError = ['error_code', 'error', 'error_description']
    .some(key => hashParams.has(key) || searchParams.has(key));
  const isInvitation = location.search.includes('convite=1')
    || invitationTokens !== null
    || hashType === 'invite';
  const isPasswordRecovery = passwordRecoveryMode
    || recoveryTokens !== null
    || hashType === 'recovery'
    || hasAuthCallbackError;
  const isPasswordSetup = isInvitation || isPasswordRecovery;
  const hasEmailAction = isInvitation || isPasswordRecovery;

  useEffect(() => {
    if (!authLoading && provider === 'sqlite' && !hasUser) {
      navigate('/setup', { replace: true });
    } else if (!authLoading && authenticated && !hasEmailAction) {
      navigate('/', { replace: true });
    }
  }, [authLoading, authenticated, hasEmailAction, hasUser, navigate, provider]);

  useEffect(() => {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(location.search);
    const accessToken = params.get('access_token') || queryParams.get('access_token');
    const refreshToken = params.get('refresh_token') || queryParams.get('refresh_token');
    const type = params.get('type') || queryParams.get('type');
    const recoveryError = params.get('error_code')
      || params.get('error')
      || params.get('error_description')
      || queryParams.get('error_code')
      || queryParams.get('error')
      || queryParams.get('error_description');
    const cleanSearch = new URLSearchParams(location.search);
    ['access_token', 'refresh_token', 'type', 'error', 'error_code', 'error_description', 'expires_at', 'expires_in', 'token_type']
      .forEach(key => cleanSearch.delete(key));
    const cleanQuery = cleanSearch.toString();
    const cleanUrl = `${location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}`;

    if (type === 'invite') {
      if (accessToken && refreshToken) {
        setInvitationTokens({ accessToken, refreshToken });
        setRecoveryTokens(null);
        setPasswordRecoveryMode(false);
        setErro(null);
      } else {
        setInvitationTokens(null);
        setErro('Este link de convite expirou ou já foi usado. Peça ao administrador para enviar outro convite.');
      }
      window.history.replaceState(null, '', cleanUrl);
    } else if (type === 'recovery' || recoveryError) {
      setInvitationTokens(null);
      setPasswordRecoveryMode(true);
      setRecoveryTokens(type === 'recovery' && accessToken && refreshToken
        ? { accessToken, refreshToken }
        : null);
      setErro(type === 'recovery' && accessToken && refreshToken
        ? null
        : 'Este link de redefinição expirou ou já foi usado. Solicite outro link.');
      window.history.replaceState(null, '', cleanUrl);
    } else if (location.search.includes('convite=1')) {
      setErro('Este link de convite expirou ou já foi usado. Peça ao administrador para enviar outro convite.');
    }
  }, [location.hash, location.pathname, location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    if (isInvitation && !invitationTokens) {
      setErro('Abra o link recebido por e-mail para aceitar o convite.');
      return;
    }
    if (isPasswordRecovery && !recoveryTokens) {
      setErro('Abra um link de redefinição válido recebido por e-mail.');
      return;
    }
    if (isPasswordSetup && senha !== confirmacaoSenha) {
      setErro('A confirmação da senha não confere.');
      return;
    }
    if (isPasswordSetup && senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    try {
      setCarregando(true);
      if (solicitarRedefinicaoSenha) {
        await apiFetch('/auth/request-password-reset', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        setMensagemSucesso('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
      } else if (isInvitation && invitationTokens) {
        await apiFetch('/auth/accept-invitation', {
          method: 'POST',
          body: JSON.stringify({ ...invitationTokens, novaSenha: senha })
        });
        await checkAuth();
      } else if (isPasswordRecovery && recoveryTokens) {
        await apiFetch('/auth/complete-password-recovery', {
          method: 'POST',
          body: JSON.stringify({ ...recoveryTokens, novaSenha: senha })
        });
        await checkAuth();
      } else {
        await login({ email: provider === 'supabase' ? email : undefined, senha });
      }
      if (!solicitarRedefinicaoSenha) navigate('/', { replace: true });
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
              <img src="/favicon.svg" alt="CheckLEAD" style={{ width: '40px', height: '40px' }} />
            </span>
          </div>
          <h1 className="auth-title" style={{ fontSize: '20px', fontWeight: 750, letterSpacing: '0.08em' }}>CheckLEAD</h1>
          <p className="auth-subtitle" style={{ fontSize: '13px', marginTop: '4px' }}>
            {isInvitation
              ? 'Ative seu acesso ao CheckLEAD'
              : isPasswordRecovery
                ? 'Defina uma nova senha para sua conta'
                : solicitarRedefinicaoSenha
                  ? 'Receba por e-mail um link para redefinir sua senha'
                  : 'Detector de vazamento de vendas'}
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

        {mensagemSucesso && (
          <div style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }} role="status">
            {mensagemSucesso}
          </div>
        )}

        {(isInvitation && !invitationTokens) || (isPasswordRecovery && !recoveryTokens) ? (
          <button
            type="button"
            className="btn-acao"
            style={{ width: '100%' }}
            onClick={() => {
              setInvitationTokens(null);
              setRecoveryTokens(null);
              setPasswordRecoveryMode(false);
              setErro(null);
              navigate('/login', { replace: true });
            }}
          >
            Voltar para o login
          </button>
        ) : (
          <form onSubmit={handleSubmit}>
            {!isPasswordSetup && provider === 'supabase' && (
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

            {!solicitarRedefinicaoSenha && (
              <div className="form-group">
                <label className="form-label" htmlFor="login-senha">
                  {isPasswordRecovery
                    ? 'Nova senha (mínimo 8 caracteres)'
                    : isInvitation
                      ? 'Crie uma senha (mínimo 8 caracteres)'
                      : 'Sua Senha de Acesso'}
                </label>
                <div className="password-input-wrap">
                  <input
                    id="login-senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    className="form-input"
                    placeholder={isPasswordRecovery
                      ? 'Digite sua nova senha'
                      : isInvitation
                        ? 'Crie uma senha segura'
                        : 'Digite sua senha'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    autoComplete={isPasswordSetup ? 'new-password' : 'current-password'}
                    required
                    autoFocus={provider === 'sqlite' || isPasswordSetup}
                  />
                  <PasswordVisibilityToggle
                    inputId="login-senha"
                    label="senha"
                    visible={mostrarSenha}
                    onToggle={() => setMostrarSenha(visible => !visible)}
                  />
                </div>
              </div>
            )}

            {isPasswordSetup && (
              <div className="form-group">
                <label className="form-label" htmlFor="confirmacao-senha">
                  {isPasswordRecovery ? 'Confirme a nova senha' : 'Confirme a senha'}
                </label>
                <div className="password-input-wrap">
                  <input
                    id="confirmacao-senha"
                    type={mostrarConfirmacaoSenha ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Digite a mesma senha"
                    value={confirmacaoSenha}
                    onChange={e => setConfirmacaoSenha(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <PasswordVisibilityToggle
                    inputId="confirmacao-senha"
                    label="confirmação de senha"
                    visible={mostrarConfirmacaoSenha}
                    onToggle={() => setMostrarConfirmacaoSenha(visible => !visible)}
                  />
                </div>
              </div>
            )}

            {provider === 'supabase' && !isPasswordSetup && (
              <p className="auth-subtitle" style={{ fontSize: '12px', marginTop: '-4px' }}>
                {solicitarRedefinicaoSenha
                  ? 'Informe o e-mail da sua conta.'
                  : 'O acesso é feito por convite do administrador.'}
              </p>
            )}

            {provider === 'supabase' && !isPasswordSetup && !solicitarRedefinicaoSenha && (
              <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '4px' }}>
                <button
                  type="button"
                  className="auth-text-link"
                  onClick={() => {
                    setSolicitarRedefinicaoSenha(true);
                    setErro(null);
                    setMensagemSucesso(null);
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            <button
              type="submit"
              className="btn-acao primary"
              style={{ width: '100%', marginTop: '12px', padding: '12px', fontSize: '15px' }}
              disabled={carregando || authLoading}
            >
              {carregando
                ? solicitarRedefinicaoSenha ? 'Enviando...' : 'Aguarde...'
                : solicitarRedefinicaoSenha
                  ? 'Enviar link de redefinição'
                : isPasswordRecovery
                  ? 'Salvar nova senha'
                  : isInvitation
                    ? 'Ativar minha conta'
                    : provider === 'supabase'
                      ? 'Entrar'
                      : 'Acessar Radar'}
            </button>

            {solicitarRedefinicaoSenha && (
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  className="auth-text-link"
                  onClick={() => {
                    setSolicitarRedefinicaoSenha(false);
                    setMensagemSucesso(null);
                    setErro(null);
                  }}
                >
                  Voltar para o login
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

interface PasswordVisibilityToggleProps {
  inputId: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
}

const PasswordVisibilityToggle: React.FC<PasswordVisibilityToggleProps> = ({
  inputId,
  label,
  visible,
  onToggle
}) => (
  <button
    type="button"
    className="password-visibility-toggle"
    aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label}`}
    aria-controls={inputId}
    aria-pressed={visible}
    onClick={onToggle}
  >
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {visible && <path d="M3 3l18 18" />}
    </svg>
  </button>
);
