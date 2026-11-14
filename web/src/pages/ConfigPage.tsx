import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import { Configuracao } from '@radar/shared';
import { LoadingState, ErrorState } from '../components/FeedbackStates.js';

export const ConfigPage: React.FC = () => {
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Troca de Senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoNova, setConfirmacaoNova] = useState('');
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState<string | null>(null);

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

  const handleSalvarLimites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    try {
      setMensagemSucesso(null);
      const atualizado = await apiFetch<Configuracao>('/config', {
        method: 'PUT',
        body: JSON.stringify(config)
      });
      setConfig(atualizado);
      setMensagemSucesso('Limites do Radar atualizados com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message || 'Falha na requisição'}`);
    }
  };

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroSenha(null);
    setSucessoSenha(null);

    if (novaSenha.length < 6) {
      setErroSenha('A nova senha deve ter no mínimo 6 caracteres.');
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
        body: JSON.stringify({ senhaAtual, novaSenha })
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
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--foreground)' }}>
          ⚙️ Configurações & Backup
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
          Ajuste as regras de vazamento e proteja seus dados
        </p>
      </div>

      {carregando && <LoadingState mensagem="Carregando ajustes..." />}

      {erro && <ErrorState mensagem={erro} onTentarNovamente={carregarConfig} />}

      {config && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Seção 1: Limites do Radar */}
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}>
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
              }}>
                {mensagemSucesso}
              </div>
            )}

            <form onSubmit={handleSalvarLimites}>
              <div className="form-group">
                <label className="form-label">
                  🚨 Lead novo sem contato (em horas):
                </label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  className="form-input"
                  value={config.limite_sem_resposta_horas}
                  onChange={e => setConfig({ ...config, limite_sem_resposta_horas: Number(e.target.value) })}
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  Padrão: 24 horas. Se passar disso sem você falar com ele, apita no Radar.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">
                  ⏰ Orçamento enviado sem follow-up (em dias):
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  className="form-input"
                  value={config.limite_follow_up_dias}
                  onChange={e => setConfig({ ...config, limite_follow_up_dias: Number(e.target.value) })}
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  Padrão: 3 dias. Orçamento na mão do cliente sem retorno vira alerta.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">
                  🧊 Lead parado sem nenhuma interação (em dias):
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  className="form-input"
                  value={config.limite_lead_parado_dias}
                  onChange={e => setConfig({ ...config, limite_lead_parado_dias: Number(e.target.value) })}
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  Padrão: 7 dias. Oportunidade esquecida que precisa de um toque.
                </small>
              </div>

              <button type="submit" className="btn-acao primary" style={{ marginTop: '8px' }}>
                Salvar Limites do Radar
              </button>
            </form>
          </div>

          {/* Seção 2: Planilha de Leads & Backup */}
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>
              Planilha de Leads & Backup
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '18px' }}>
              Importe seus contatos via planilha CSV, baixe o modelo padrão ou exporte para Excel/JSON.
            </p>

            {resultadoImport && (
              <div style={{
                background: 'hsl(160 70% 45% / 0.12)',
                border: '1px solid hsl(160 70% 45% / 0.3)',
                color: 'hsl(160 70% 70%)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {resultadoImport}
              </div>
            )}

            {erroImport && (
              <div style={{
                background: 'hsl(0 84% 60% / 0.12)',
                border: '1px solid hsl(0 84% 60% / 0.3)',
                color: 'var(--destructive)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {erroImport}
              </div>
            )}

            {/* Destaque: Importação e Modelo de Planilha */}
            <div style={{
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              marginBottom: '20px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '6px' }}>
                📊 Importar Planilha de Leads (CSV)
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '14px' }}>
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
              <label className="form-label" style={{ fontSize: '12px' }}>Restaurar cópia de segurança completa (JSON):</label>
              <input
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
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>
              Segurança: Trocar Senha
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '18px' }}>
              Altere a senha de acesso ao seu Radar de Leads.
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
              }}>
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
              }}>
                {sucessoSenha}
              </div>
            )}

            <form onSubmit={handleTrocarSenha}>
              <div className="form-group">
                <label className="form-label">Senha Atual</label>
                <input
                  type="password"
                  className="form-input"
                  value={senhaAtual}
                  onChange={e => setSenhaAtual(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nova Senha (mínimo 6 caracteres)</label>
                <input
                  type="password"
                  className="form-input"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirme a Nova Senha</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmacaoNova}
                  onChange={e => setConfirmacaoNova(e.target.value)}
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
        </div>
      )}
    </div>
  );
};
