import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import type { Configuracao, UserSummary } from '@radar/shared';
import { LoadingState, ErrorState } from '../components/FeedbackStates.js';
import { useAuth } from '../context/AuthContext.js';

export const ConfigPage: React.FC = () => {
  const { provider, user } = useAuth();
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [erroSalvarLimites, setErroSalvarLimites] = useState<string | null>(null);

  // Troca de Senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoNova, setConfirmacaoNova] = useState('');
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UserSummary[]>([]);
  const [emailConvite, setEmailConvite] = useState('');
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [erroConvite, setErroConvite] = useState<string | null>(null);
  const [sucessoConvite, setSucessoConvite] = useState<string | null>(null);
  const [erroUsuarios, setErroUsuarios] = useState<string | null>(null);
  const [sucessoUsuarios, setSucessoUsuarios] = useState<string | null>(null);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);
  const [usuarioExcluindo, setUsuarioExcluindo] = useState<string | null>(null);

  // Importação e Exportação
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<string | null>(null);
  const [erroImport, setErroImport] = useState<string | null>(null);

  const carregarConfig = async () => {
    try {
      setCarregando(true);
      setErro(null);
      const data = await apiFetch<Configuracao>('/config');
      setConfig(data);
    } catch (err: any) {
      setErro(err.message || 'Falha ao carregar configurações');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarConfig();
  }, []);

  useEffect(() => {
    if (provider !== 'supabase' || user?.role !== 'admin') return;

    let active = true;
    setCarregandoUsuarios(true);
    apiFetch<UserSummary[]>('/auth/users')
      .then(data => {
        if (active) setUsuarios(data);
      })
      .catch(err => {
        if (active) setErroUsuarios(err instanceof Error ? err.message : 'Falha ao carregar usuários.');
      })
      .finally(() => {
        if (active) setCarregandoUsuarios(false);
      });

    return () => {
      active = false;
    };
  }, [provider, user?.id, user?.role]);

  const handleSalvarLimites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    try {
      setMensagemSucesso(null);
      setErroSalvarLimites(null);
      const atualizado = await apiFetch<Configuracao>('/config', {
        method: 'PUT',
        body: JSON.stringify(config)
      });
      setConfig(atualizado);
      setMensagemSucesso('Limites do Radar atualizados com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      setErroSalvarLimites(err.message || 'Falha ao salvar os limites do Radar.');
    }
  };

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroSenha(null);
    setSucessoSenha(null);

    const tamanhoMinimo = provider === 'supabase' ? 8 : 6;
    if (novaSenha.length < tamanhoMinimo) {
      setErroSenha(`A nova senha deve ter no mínimo ${tamanhoMinimo} caracteres.`);
      return;
    }

    if (novaSenha !== confirmacaoNova) {
      setErroSenha('A confirmação da nova senha não confere.');
      return;
    }

    try {
      setTrocandoSenha(true);
      await apiFetch('/auth/senha', {
        method: 'PUT',
        body: JSON.stringify(provider === 'supabase' ? { novaSenha } : { senhaAtual, novaSenha })
      });
      setSucessoSenha('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmacaoNova('');
    } catch (err: any) {
      setErroSenha(err.message || 'Erro ao trocar senha');
    } finally {
      setTrocandoSenha(false);
    }
  };

  const handleConvidarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroConvite(null);
    setSucessoConvite(null);
    setErroUsuarios(null);

    try {
      setEnviandoConvite(true);
      const resultado = await apiFetch<{ message: string }>('/auth/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: emailConvite })
      });
      setSucessoConvite(resultado.message);
      setEmailConvite('');
      try {
        setUsuarios(await apiFetch<UserSummary[]>('/auth/users'));
      } catch (err) {
        setErroUsuarios(err instanceof Error ? err.message : 'Convite enviado, mas a lista de usuários não pôde ser atualizada.');
      }
    } catch (err) {
      setErroConvite(err instanceof Error ? err.message : 'Falha ao enviar convite.');
    } finally {
      setEnviandoConvite(false);
    }
  };

  const handleExcluirUsuario = async (usuario: UserSummary) => {
    const email = usuario.email || 'esta conta';
    const confirmou = window.confirm(
      `Excluir permanentemente ${email}? Os leads, interações e configurações dessa conta também serão excluídos. Essa ação não pode ser desfeita.`
    );
    if (!confirmou) return;

    setErroUsuarios(null);
    setSucessoUsuarios(null);
    try {
      setUsuarioExcluindo(usuario.id);
      await apiFetch(`/auth/users/${encodeURIComponent(usuario.id)}`, { method: 'DELETE' });
      setUsuarios(current => current.filter(item => item.id !== usuario.id));
      setSucessoUsuarios(`A conta de ${email} e os dados vinculados foram excluídos.`);
    } catch (err) {
      setErroUsuarios(err instanceof Error ? err.message : 'Falha ao excluir a conta.');
    } finally {
      setUsuarioExcluindo(null);
    }
  };

  const handleExportarJson = () => {
    window.open('/api/backup/export/json', '_blank');
  };

  const handleExportarCsv = () => {
    window.open('/api/backup/export/csv', '_blank');
  };

  const handleBaixarModeloCsv = () => {
    window.open('/api/backup/modelo-csv', '_blank');
  };

  const handleImportarArquivoCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportando(true);
      setResultadoImport(null);
      setErroImport(null);

      const texto = await file.text();
      const res: any = await apiFetch('/backup/import/csv', {
        method: 'POST',
        body: JSON.stringify({ csv: texto })
      });

      setResultadoImport(res.message || 'Leads importados com sucesso!');
    } catch (err: any) {
      setErroImport(err.message || 'Falha ao importar planilha de leads');
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  const handleImportarArquivoJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: A importação do backup JSON substituirá os leads e interações atuais. Deseja prosseguir?')) {
      e.target.value = '';
      return;
    }

    try {
      setImportando(true);
      setResultadoImport(null);
      setErroImport(null);
      const texto = await file.text();
      const json = JSON.parse(texto);

      const res: any = await apiFetch('/backup/import/json', {
        method: 'POST',
        body: JSON.stringify(json)
      });

      setResultadoImport(res.message || 'Backup restaurado com sucesso!');
      await carregarConfig();
    } catch (err: any) {
      setErroImport(err.message || 'Arquivo JSON inválido');
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  return (
    <div className="container">
      <div className="page-heading">
        <h2 className="page-title">
          ⚙️ Configurações & Backup
        </h2>
        <p className="page-subtitle">
          Ajuste as regras de vazamento e proteja seus dados
        </p>
      </div>

      {carregando && <LoadingState mensagem="Carregando ajustes..." />}

      {erro && <ErrorState mensagem={erro} onTentarNovamente={carregarConfig} />}

      {config && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Seção 1: Limites do Radar */}
          <div className="config-section">
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>
              Regras do Detector de Vazamento
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '18px' }}>
              Defina quando o sistema deve acionar alertas no painel &quot;Agir agora&quot;.
            </p>

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

            {erroSalvarLimites && (
              <div className="config-message error" role="alert">
                {erroSalvarLimites}
              </div>
            )}

            <form onSubmit={handleSalvarLimites}>
              <div className="form-group">
                <label className="form-label" htmlFor="limite-sem-resposta">
                  🚨 Lead novo sem contato (em horas):
                </label>
                <input
                  id="limite-sem-resposta"
                  type="number"
                  min="1"
                  max="720"
                  className="form-input"
                  value={config.limite_sem_resposta_horas}
                  onChange={e => setConfig({ ...config, limite_sem_resposta_horas: Number(e.target.value) })}
                  aria-describedby="ajuda-limite-sem-resposta"
                  required
                />
                <small id="ajuda-limite-sem-resposta" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  Padrão: 24 horas. Se passar disso sem você falar com ele, apita no Radar.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="limite-follow-up">
                  ⏰ Orçamento enviado sem follow-up (em dias):
                </label>
                <input
                  id="limite-follow-up"
                  type="number"
                  min="1"
                  max="90"
                  className="form-input"
                  value={config.limite_follow_up_dias}
                  onChange={e => setConfig({ ...config, limite_follow_up_dias: Number(e.target.value) })}
                  aria-describedby="ajuda-limite-follow-up"
                  required
                />
                <small id="ajuda-limite-follow-up" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  Padrão: 3 dias. Orçamento na mão do cliente sem retorno vira alerta.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="limite-lead-parado">
                  🧊 Lead parado sem nenhuma interação (em dias):
                </label>
                <input
                  id="limite-lead-parado"
                  type="number"
                  min="1"
                  max="180"
                  className="form-input"
                  value={config.limite_lead_parado_dias}
                  onChange={e => setConfig({ ...config, limite_lead_parado_dias: Number(e.target.value) })}
                  aria-describedby="ajuda-limite-lead-parado"
                  required
                />
                <small id="ajuda-limite-lead-parado" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  Padrão: 7 dias. Oportunidade esquecida que precisa de um toque.
                </small>
              </div>

              <button type="submit" className="btn-acao primary" style={{ marginTop: '8px' }}>
                Salvar Limites do Radar
              </button>
            </form>
          </div>

          {/* Seção 2: Planilha de Leads & Backup */}
          <div className="config-section">
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>
              Planilha de Leads & Backup
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '18px' }}>
              Importe seus contatos via planilha CSV, baixe o modelo padrão ou exporte para Excel/JSON.
            </p>

            {resultadoImport && (
              <div className="config-message success" role="status">
                {resultadoImport}
              </div>
            )}

            {erroImport && (
              <div className="config-message error" role="alert">
                {erroImport}
              </div>
            )}

            {/* Destaque: Importação e Modelo de Planilha */}
            <div className="config-import-panel">
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-ink)', marginBottom: '6px' }}>
                📊 Importar Planilha de Leads (CSV)
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--primary-ink)', marginBottom: '14px' }}>
                Colunas aceitas: <b>Nome</b>, <b>WhatsApp</b>, <b>E-mail</b>, <b>Responsável</b>, <b>Serviço</b>, <b>Valor Estimado (R$)</b>, <b>Origem</b>, <b>Status</b> e <b>Motivo da Perda</b>.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleBaixarModeloCsv}
                  className="btn-acao"
                  title="Baixa um arquivo .csv com as colunas padrão prontas para preencher"
                >
                  📥 Baixar Planilha Modelo Vazia
                </button>

                <label
                  className="btn-acao primary"
                  style={{
                    cursor: importando ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: 0
                  }}
                >
                  <span>📤 {importando ? 'Enviando...' : 'Fazer Upload de Planilha (.csv)'}</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleImportarArquivoCsv}
                    disabled={importando}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            {/* Outras opções de exportação */}
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Exportação e Backup Geral
            </h4>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
              <button onClick={handleExportarCsv} className="btn-acao">
                📊 Baixar Planilha Atual (CSV)
              </button>
              <button onClick={handleExportarJson} className="btn-acao">
                💾 Baixar Backup JSON Completo
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <label className="form-label" htmlFor="backup-json-file" style={{ fontSize: '12px' }}>Restaurar cópia de segurança completa (JSON):</label>
              <input
                id="backup-json-file"
                type="file"
                accept=".json"
                onChange={handleImportarArquivoJson}
                disabled={importando}
                style={{ fontSize: '13px' }}
              />
              {importando && <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>Processando arquivo...</p>}
            </div>
          </div>

          {/* Seção 3: Troca de Senha */}
          <div className="config-section">
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>
              Segurança: Trocar Senha
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '18px' }}>
              {provider === 'supabase'
                ? 'Altere a senha da sua conta.'
                : 'Altere a senha de acesso ao seu Radar de Leads.'}
            </p>

            {erroSenha && (
              <div style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px'
              }} role="alert">
                {erroSenha}
              </div>
            )}

            {sucessoSenha && (
              <div style={{
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                color: 'var(--success)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px'
              }} role="status">
                {sucessoSenha}
              </div>
            )}

            <form onSubmit={handleTrocarSenha}>
              {provider === 'sqlite' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="senha-atual">Senha Atual</label>
                  <input
                    id="senha-atual"
                    type="password"
                    className="form-input"
                    value={senhaAtual}
                    onChange={e => setSenhaAtual(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="nova-senha">Nova Senha (mínimo {provider === 'supabase' ? 8 : 6} caracteres)</label>
                <input
                  id="nova-senha"
                  type="password"
                  className="form-input"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  autoComplete="new-password"
                  minLength={provider === 'supabase' ? 8 : 6}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmacao-nova-senha">Confirme a Nova Senha</label>
                <input
                  id="confirmacao-nova-senha"
                  type="password"
                  className="form-input"
                  value={confirmacaoNova}
                  onChange={e => setConfirmacaoNova(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-acao primary"
                disabled={trocandoSenha}
              >
                {trocandoSenha ? 'Atualizando...' : 'Atualizar Senha'}
              </button>
            </form>
          </div>

          {provider === 'supabase' && user?.role === 'admin' && (
            <section className="config-section" aria-labelledby="usuarios-title">
              <h3 id="usuarios-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>
                Usuários e convites
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '18px' }}>
                Convide pessoas por e-mail. Cada conta acessa somente os próprios leads e configurações.
              </p>

              {erroConvite && <div className="config-message error" role="alert">{erroConvite}</div>}
              {sucessoConvite && <div className="config-message success" role="status">{sucessoConvite}</div>}
              {erroUsuarios && <div className="config-message error" role="alert">{erroUsuarios}</div>}
              {sucessoUsuarios && <div className="config-message success" role="status">{sucessoUsuarios}</div>}

              <form onSubmit={handleConvidarUsuario} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'end' }}>
                <div className="form-group" style={{ flex: '1 1 240px', marginBottom: 0 }}>
                  <label className="form-label" htmlFor="email-convite">E-mail do novo usuário</label>
                  <input
                    id="email-convite"
                    type="email"
                    className="form-input"
                    value={emailConvite}
                    onChange={e => setEmailConvite(e.target.value)}
                    autoComplete="email"
                    placeholder="nome@exemplo.com"
                    required
                  />
                </div>
                <button type="submit" className="btn-acao primary" disabled={enviandoConvite}>
                  {enviandoConvite ? 'Enviando...' : 'Enviar convite'}
                </button>
              </form>

              <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-foreground)', margin: '22px 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Contas cadastradas
              </h4>
              {carregandoUsuarios ? (
                <p style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>Carregando usuários...</p>
              ) : usuarios.length > 0 ? (
                <ul style={{ listStyle: 'none', borderTop: '1px solid var(--line)' }}>
                  {usuarios.map(usuario => (
                    <li key={usuario.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--line-soft)',
                      fontSize: '13px'
                    }}>
                      <span style={{ flex: '1 1 180px', overflowWrap: 'anywhere', color: 'var(--foreground)' }}>
                        {usuario.email || 'E-mail indisponível'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                          {usuario.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </span>
                        {usuario.id === user?.id ? (
                          <span style={{ color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>Sua conta</span>
                        ) : (
                          <button
                            type="button"
                            className="btn-acao danger"
                            aria-label={`Excluir conta de ${usuario.email || 'usuário'}`}
                            disabled={usuarioExcluindo !== null}
                            onClick={() => handleExcluirUsuario(usuario)}
                          >
                            {usuarioExcluindo === usuario.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--muted-foreground)', fontSize: '13px' }}>Nenhum usuário cadastrado.</p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
