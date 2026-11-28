import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { LeadAbordagem, LeadComInteracoes } from '@radar/shared';
import { formatarMoeda, formatarDataHora, formatarStatusLead, gerarLinkContato } from '../utils/formatters.js';
import { gerarLinksSociaisLead } from '../utils/socialLinks.js';
import { LoadingState, ErrorState } from '../components/FeedbackStates.js';
import { ModalAcao } from '../components/ModalAcao.js';
import { ModalEditarLead } from '../components/ModalEditarLead.js';
import { FeedbackAcaoRapida } from '../components/FeedbackAcaoRapida.js';

type TipoAcaoRapida = 'contato' | 'orcamento' | 'fechou' | 'standby' | 'reativar';

export const LeadDetalhesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<LeadComInteracoes | null>(null);
  const [abordagens, setAbordagens] = useState<LeadAbordagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [abordagemEmSalvamento, setAbordagemEmSalvamento] = useState<number | null>(null);
  const [adicionandoAbordagem, setAdicionandoAbordagem] = useState(false);
  const [feedbackAbordagem, setFeedbackAbordagem] = useState<{ id: number | 'nova'; tipo: 'sucesso' | 'erro'; mensagem: string } | null>(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<TipoAcaoRapida | null>(null);
  const [feedbackAcao, setFeedbackAcao] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; mensagem: string } | null>(null);
  const [acaoRapidaEmAndamento, setAcaoRapidaEmAndamento] = useState(false);
  const acaoRapidaEmAndamentoRef = useRef(false);

  const [modalAcao, setModalAcao] = useState<{
    aberto: boolean;
    tipo: 'perdeu' | 'nota';
  }>({
    aberto: false,
    tipo: 'nota'
  });

  const carregarLead = async (silencioso = false): Promise<boolean> => {
    try {
      if (!silencioso) {
        setCarregando(true);
        setErro(null);
      }
      const [data, abordagensData] = await Promise.all([
        apiFetch<LeadComInteracoes>(`/leads/${id}`),
        apiFetch<LeadAbordagem[]>(`/leads/${id}/abordagens`)
      ]);
      setLead(data);
      setAbordagens(abordagensData);
      return true;
    } catch (err: any) {
      if (!silencioso) {
        setErro(err.message || 'Falha ao carregar detalhes do lead');
      }
      return false;
    } finally {
      if (!silencioso) {
        setCarregando(false);
      }
    }
  };

  useEffect(() => {
    carregarLead();
  }, [id]);

  const handleAcaoRapida = async (tipoAcao: TipoAcaoRapida) => {
    if (!lead || acaoRapidaEmAndamentoRef.current) return;
    if (tipoAcao === 'fechou' && !window.confirm(`Confirmar que a venda de ${lead.nome} foi fechada?`)) {
      return;
    }

    acaoRapidaEmAndamentoRef.current = true;
    setAcaoRapidaEmAndamento(true);
    setAcaoEmAndamento(tipoAcao);
    setFeedbackAcao(null);

    try {
      await apiFetch(`/leads/${lead.id}/acoes`, {
        method: 'POST',
        body: JSON.stringify({ tipo: tipoAcao })
      });
      const atualizado = await carregarLead(true);
      setFeedbackAcao({
        tipo: atualizado ? 'sucesso' : 'aviso',
        mensagem: atualizado
          ? `Ação registrada para ${lead.nome}.`
          : `Ação registrada para ${lead.nome}, mas o histórico não foi atualizado. Atualize para conferir.`
      });
    } catch {
      setFeedbackAcao({
        tipo: 'erro',
        mensagem: `Não foi possível confirmar se a ação foi registrada para ${lead.nome}. Atualize o histórico antes de tentar novamente.`
      });
    } finally {
      acaoRapidaEmAndamentoRef.current = false;
      setAcaoRapidaEmAndamento(false);
      setAcaoEmAndamento(null);
    }
  };

  const handleAtualizarAposAcao = async () => {
    if (await carregarLead(true)) {
      setFeedbackAcao(null);
    }
  };

  const atualizarRascunhoAbordagem = (id: number, alteracoes: Partial<LeadAbordagem>) => {
    setAbordagens(prev => prev.map(item => item.id === id ? { ...item, ...alteracoes } : item));
    if (feedbackAbordagem?.id === id) {
      setFeedbackAbordagem(null);
    }
  };

  const salvarAbordagem = async (abordagem: LeadAbordagem) => {
    if (!lead || abordagemEmSalvamento !== null) return;
    setAbordagemEmSalvamento(abordagem.id);
    setFeedbackAbordagem(null);

    try {
      const atualizada = await apiFetch<LeadAbordagem>(`/leads/${lead.id}/abordagens/${abordagem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titulo: abordagem.titulo,
          canal: abordagem.canal,
          mensagem: abordagem.mensagem,
          resultado: abordagem.resultado,
          status: abordagem.status
        })
      });
      setAbordagens(prev => prev.map(item => item.id === atualizada.id ? atualizada : item));
      setFeedbackAbordagem({ id: abordagem.id, tipo: 'sucesso', mensagem: 'Abordagem salva.' });
    } catch (err: any) {
      setFeedbackAbordagem({
        id: abordagem.id,
        tipo: 'erro',
        mensagem: err.message || 'Não foi possível salvar a abordagem. Tente novamente.'
      });
    } finally {
      setAbordagemEmSalvamento(null);
    }
  };

  const adicionarAbordagem = async () => {
    if (!lead || adicionandoAbordagem) return;
    setAdicionandoAbordagem(true);
    setFeedbackAbordagem(null);

    try {
      const numero = abordagens.length;
      const novaAbordagem = await apiFetch<LeadAbordagem>(`/leads/${lead.id}/abordagens`, {
        method: 'POST',
        body: JSON.stringify({
          titulo: `Abordagem ${numero}`,
          canal: null,
          mensagem: '',
          resultado: '',
          status: 'rascunho'
        })
      });
      setAbordagens(prev => [...prev, novaAbordagem].sort((a, b) => a.numero - b.numero));
      setFeedbackAbordagem({ id: novaAbordagem.id, tipo: 'sucesso', mensagem: 'Nova abordagem adicionada.' });
    } catch (err: any) {
      setFeedbackAbordagem({
        id: 'nova',
        tipo: 'erro',
        mensagem: err.message || 'Não foi possível adicionar a abordagem. Tente novamente.'
      });
    } finally {
      setAdicionandoAbordagem(false);
    }
  };

  const handleExcluir = async () => {
    if (!lead) return;
    if (confirm(`Tem certeza que deseja excluir o lead "${lead.nome}" e todo o histórico?`)) {
      try {
        await apiFetch(`/leads/${lead.id}`, { method: 'DELETE' });
        navigate('/leads');
      } catch (err: any) {
        alert(`Erro ao excluir: ${err.message || 'Falha na exclusão'}`);
      }
    }
  };

  if (carregando) {
    return (
      <div className="container">
        <LoadingState mensagem="Carregando histórico do lead..." />
      </div>
    );
  }

  if (erro || !lead) {
    return (
      <div className="container">
        <ErrorState
          mensagem={erro || 'Lead não encontrado'}
          onTentarNovamente={carregarLead}
        />
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Link to="/leads" className="btn-acao">← Voltar para lista</Link>
        </div>
      </div>
    );
  }

  const contatoInfo = gerarLinkContato(lead.contato);
  const { instagramHandle, instagramUrl, googleMeuNegocioUrl, siteUrl } = gerarLinksSociaisLead(
    lead.instagram,
    lead.google_meu_negocio,
    lead.site
  );

  return (
    <div className="container">
      <div style={{ marginBottom: '16px' }}>
        <Link to="/leads" style={{ color: 'var(--muted-foreground)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          ← Voltar para todos os leads
        </Link>
      </div>

      {feedbackAcao && (
        <FeedbackAcaoRapida
          tipo={feedbackAcao.tipo}
          mensagem={feedbackAcao.mensagem}
          acao={feedbackAcao.tipo !== 'sucesso'
            ? { rotulo: 'Atualizar histórico', executar: handleAtualizarAposAcao, desabilitada: acaoRapidaEmAndamento }
            : undefined}
        />
      )}

      {/* Cartão Principal de Informações */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className={`badge-status ${lead.status}`} style={{ marginBottom: '10px', display: 'inline-block' }}>
              Status: {formatarStatusLead(lead.status)}
            </span>
            <div className="lead-detail-title-row">
              <h1 style={{ fontSize: '24px', fontWeight: 750, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>{lead.nome}</h1>
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="lead-social-link">
                  @{instagramHandle}
                </a>
              )}
              {siteUrl && (
                <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="lead-social-link">
                  🌐 Site
                </a>
              )}
              {googleMeuNegocioUrl && (
                <a href={googleMeuNegocioUrl} target="_blank" rel="noopener noreferrer" className="lead-social-link">
                  Google Meu Negócio
                </a>
              )}
            </div>
            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              {lead.servico} · <small>Canal: {lead.origem}</small>
              {lead.responsavel && (
                <span style={{ marginLeft: '8px', color: 'var(--foreground)', fontWeight: 600 }}>
                  · 👤 Responsável: {lead.responsavel}
                </span>
              )}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>VALOR ESTIMADO</div>
            <div style={{ fontSize: '22px', fontWeight: 750, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              {formatarMoeda(lead.valor_estimado)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          {lead.whatsapp && (
            <a
              href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '').length <= 11 ? `55${lead.whatsapp.replace(/\D/g, '')}` : lead.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="btn-acao contact-whatsapp"
              style={{ padding: '8px 14px' }}
            >
              💬 WhatsApp ({lead.whatsapp})
            </a>
          )}

          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              target="_blank"
              rel="noreferrer"
              className="btn-acao contact-email"
              style={{ padding: '8px 14px' }}
            >
              ✉️ E-mail ({lead.email})
            </a>
          )}

          {!lead.whatsapp && !lead.email && (
            <a
              href={contatoInfo.href}
              target="_blank"
              rel="noreferrer"
              className={`btn-acao ${contatoInfo.tipo === 'whatsapp' ? 'contact-whatsapp' : 'contact-email'}`}
              style={{ padding: '8px 14px' }}
            >
              {contatoInfo.tipo === 'whatsapp' ? '💬 Iniciar WhatsApp' : '✉️ Enviar Mensagem'} ({contatoInfo.label})
            </a>
          )}

          <button
            className="btn-acao"
            style={{ fontWeight: 600 }}
            onClick={() => setModalEditarAberto(true)}
            title="Editar informações do lead"
          >
            ✏️ Editar Lead
          </button>

          {lead.status !== 'fechado' && lead.status !== 'perdido' && (
            <>
              <button
                className="btn-acao primary"
                onClick={() => handleAcaoRapida('contato')}
                disabled={acaoRapidaEmAndamento}
                aria-busy={acaoEmAndamento === 'contato'}
              >
                {acaoEmAndamento === 'contato' ? 'Registrando...' : '📞 Registrei contato'}
              </button>
              {lead.status === 'novo' && (
                <button
                  className="btn-acao"
                  onClick={() => handleAcaoRapida('orcamento')}
                  disabled={acaoRapidaEmAndamento}
                  aria-busy={acaoEmAndamento === 'orcamento'}
                >
                  {acaoEmAndamento === 'orcamento' ? 'Registrando...' : '📄 Enviei orçamento'}
                </button>
              )}
              <button
                className="btn-acao success"
                onClick={() => handleAcaoRapida('fechou')}
                disabled={acaoRapidaEmAndamento}
                aria-busy={acaoEmAndamento === 'fechou'}
              >
                {acaoEmAndamento === 'fechou' ? 'Registrando...' : '✅ Fechou'}
              </button>
              <button className="btn-acao danger" onClick={() => setModalAcao({ aberto: true, tipo: 'perdeu' })} disabled={acaoRapidaEmAndamento}>
                ❌ Perdeu
              </button>
              {lead.status === 'standby' ? (
                <button
                  className="btn-acao"
                  onClick={() => handleAcaoRapida('reativar')}
                  disabled={acaoRapidaEmAndamento}
                  aria-busy={acaoEmAndamento === 'reativar'}
                  title="Reativar lead e voltar a monitorar prazos"
                >
                  {acaoEmAndamento === 'reativar' ? 'Reativando...' : '▶️ Reativar'}
                </button>
              ) : (
                <button
                  className="btn-acao"
                  onClick={() => handleAcaoRapida('standby')}
                  disabled={acaoRapidaEmAndamento}
                  aria-busy={acaoEmAndamento === 'standby'}
                  title="Pausar prazos deste lead e não monitorar no radar"
                >
                  {acaoEmAndamento === 'standby' ? 'Pausando...' : '⏸️ Standby'}
                </button>
              )}
            </>
          )}

          <button className="btn-acao" onClick={() => setModalAcao({ aberto: true, tipo: 'nota' })}>
            📝 Nova nota
          </button>

          <button
            onClick={handleExcluir}
            className="btn-acao"
            style={{ marginLeft: 'auto', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
            title="Excluir lead definitivamente"
          >
            🗑️ Excluir
          </button>
        </div>
      </div>

      <section className="lead-approaches" aria-labelledby="lead-approaches-title">
        <div className="lead-approaches-heading">
          <div>
            <h2 id="lead-approaches-title">Abordagens</h2>
            <p>Prepare cada contato e registre o retorno do lead.</p>
          </div>
          <button
            type="button"
            className="btn-acao"
            onClick={adicionarAbordagem}
            disabled={adicionandoAbordagem}
          >
            {adicionandoAbordagem ? 'Adicionando...' : '+ Adicionar abordagem'}
          </button>
        </div>

        <div className="lead-approach-list">
          {abordagens.map(abordagem => {
            const salvando = abordagemEmSalvamento === abordagem.id;
            const feedback = feedbackAbordagem?.id === abordagem.id ? feedbackAbordagem : null;

            return (
              <article className="lead-approach" key={abordagem.id}>
                <div className="lead-approach-header">
                  <span className="lead-approach-number">Abordagem {abordagem.numero}</span>
                  <span className={`lead-approach-status lead-approach-status-${abordagem.status}`}>
                    {abordagem.status === 'concluida' ? 'Concluída' : abordagem.status === 'enviada' ? 'Enviada' : 'Rascunho'}
                  </span>
                </div>

                <div className="lead-approach-fields">
                  <div className="form-group">
                    <label className="form-label" htmlFor={`abordagem-titulo-${abordagem.id}`}>Objetivo da abordagem</label>
                    <input
                      id={`abordagem-titulo-${abordagem.id}`}
                      className="form-input"
                      value={abordagem.titulo}
                      maxLength={100}
                      disabled={salvando}
                      onChange={event => atualizarRascunhoAbordagem(abordagem.id, { titulo: event.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor={`abordagem-canal-${abordagem.id}`}>Canal</label>
                    <select
                      id={`abordagem-canal-${abordagem.id}`}
                      className="form-select"
                      value={abordagem.canal || ''}
                      disabled={salvando}
                      onChange={event => atualizarRascunhoAbordagem(abordagem.id, {
                        canal: (event.target.value || null) as LeadAbordagem['canal']
                      })}
                    >
                      <option value="">Não definido</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">E-mail</option>
                      <option value="telefone">Ligação</option>
                      <option value="instagram">Instagram</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div className="form-group lead-approach-message">
                    <label className="form-label" htmlFor={`abordagem-mensagem-${abordagem.id}`}>Texto da abordagem</label>
                    <textarea
                      id={`abordagem-mensagem-${abordagem.id}`}
                      className="form-textarea"
                      rows={4}
                      maxLength={5000}
                      placeholder="Escreva aqui o texto que você pretende enviar."
                      value={abordagem.mensagem}
                      disabled={salvando}
                      onChange={event => atualizarRascunhoAbordagem(abordagem.id, { mensagem: event.target.value })}
                    />
                  </div>

                  <div className="form-group lead-approach-result">
                    <label className="form-label" htmlFor={`abordagem-resultado-${abordagem.id}`}>Retorno / observações</label>
                    <textarea
                      id={`abordagem-resultado-${abordagem.id}`}
                      className="form-textarea"
                      rows={3}
                      maxLength={2000}
                      placeholder="Registre quem decide, o que respondeu ou o próximo passo."
                      value={abordagem.resultado}
                      disabled={salvando}
                      onChange={event => atualizarRascunhoAbordagem(abordagem.id, { resultado: event.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor={`abordagem-status-${abordagem.id}`}>Status</label>
                    <select
                      id={`abordagem-status-${abordagem.id}`}
                      className="form-select"
                      value={abordagem.status}
                      disabled={salvando}
                      onChange={event => atualizarRascunhoAbordagem(abordagem.id, {
                        status: event.target.value as LeadAbordagem['status']
                      })}
                    >
                      <option value="rascunho">Rascunho</option>
                      <option value="enviada">Enviada</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>
                </div>

                <div className="lead-approach-footer">
                  {feedback && (
                    <p className={`lead-approach-feedback ${feedback.tipo}`} role="status">
                      {feedback.mensagem}
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn-acao primary"
                    onClick={() => salvarAbordagem(abordagem)}
                    disabled={salvando || abordagemEmSalvamento !== null}
                  >
                    {salvando ? 'Salvando...' : 'Salvar abordagem'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {feedbackAbordagem?.id === 'nova' && (
          <p className="lead-approach-feedback erro" role="status">{feedbackAbordagem.mensagem}</p>
        )}
      </section>

      {/* Linha do Tempo de Interações */}
      <div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>
          Linha do Tempo ({lead.interacoes.length} {lead.interacoes.length === 1 ? 'registro' : 'registros'})
        </h3>

        {lead.interacoes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Nenhuma interação registrada ainda.</p>
        ) : (
          <div className="timeline">
            {lead.interacoes.map(it => (
              <div key={it.id} className="timeline-item">
                <div className="timeline-point" />
                <div className="timeline-header">
                  <span className={`timeline-tipo timeline-tipo-${it.tipo}`}>
                    {it.tipo === 'orcamento' ? '📄 Orçamento' : it.tipo === 'contato' ? '📞 Contato' : it.tipo === 'follow_up' ? '🔄 Follow-up' : '📝 Nota'}
                  </span>
                  <span>{formatarDataHora(it.criado_em)}</span>
                </div>
                <div className="timeline-texto">
                  {it.texto}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalAcao
        aberto={modalAcao.aberto}
        tipo={modalAcao.tipo}
        leadId={lead.id}
        leadNome={lead.nome}
        onFechar={() => setModalAcao(prev => ({ ...prev, aberto: false }))}
        onSucesso={carregarLead}
      />

      <ModalEditarLead
        aberto={modalEditarAberto}
        lead={lead}
        onFechar={() => setModalEditarAberto(false)}
        onAtualizado={() => carregarLead()}
      />
    </div>
  );
};
