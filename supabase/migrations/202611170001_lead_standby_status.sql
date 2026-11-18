-- Atualiza a verificação de status para incluir 'standby'
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('novo', 'orcamento_enviado', 'fechado', 'perdido', 'standby'));

-- Atualiza a RPC executar_acao_lead para suportar 'standby' e 'reativar'
CREATE OR REPLACE FUNCTION public.executar_acao_lead(p_user_id uuid, p_id integer, p_acao jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  lead_atual public.leads%ROWTYPE;
  agora timestamptz := now();
  tipo_acao text := p_acao->>'tipo';
  texto_acao text := nullif(p_acao->>'texto', '');
BEGIN
  SELECT * INTO lead_atual
  FROM public.leads
  WHERE id = p_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;

  CASE tipo_acao
    WHEN 'contato' THEN
      UPDATE public.leads SET ultimo_contato_em = agora WHERE id = p_id AND user_id = p_user_id;
      INSERT INTO public.interacoes (user_id, lead_id, tipo, texto, criado_em)
      VALUES (p_user_id, p_id, 'contato', coalesce(texto_acao, 'Contato realizado com o cliente.'), agora);
    WHEN 'orcamento' THEN
      UPDATE public.leads
      SET status = 'orcamento_enviado', orcamento_enviado_em = agora, ultimo_contato_em = agora
      WHERE id = p_id AND user_id = p_user_id;
      INSERT INTO public.interacoes (user_id, lead_id, tipo, texto, criado_em)
      VALUES (p_user_id, p_id, 'orcamento', coalesce(texto_acao, 'Orçamento enviado com sucesso.'), agora);
    WHEN 'follow_up' THEN
      UPDATE public.leads SET ultimo_contato_em = agora WHERE id = p_id AND user_id = p_user_id;
      INSERT INTO public.interacoes (user_id, lead_id, tipo, texto, criado_em)
      VALUES (p_user_id, p_id, 'follow_up', coalesce(texto_acao, 'Follow-up de cobrança ou acompanhamento realizado.'), agora);
    WHEN 'fechou' THEN
      UPDATE public.leads
      SET status = 'fechado', fechado_em = agora, ultimo_contato_em = agora
      WHERE id = p_id AND user_id = p_user_id;
      INSERT INTO public.interacoes (user_id, lead_id, tipo, texto, criado_em)
      VALUES (p_user_id, p_id, 'contato', coalesce(texto_acao, 'Venda concluída! Lead marcado como fechado.'), agora);
    WHEN 'perdeu' THEN
      UPDATE public.leads
      SET status = 'perdido', fechado_em = agora, motivo_perda = p_acao->>'motivo_perda'
      WHERE id = p_id AND user_id = p_user_id;
      INSERT INTO public.interacoes (user_id, lead_id, tipo, texto, criado_em)
      VALUES (p_user_id, p_id, 'nota', coalesce(texto_acao, format('Venda perdida. Motivo: %s', p_acao->>'motivo_perda')), agora);
    WHEN 'nota' THEN
      INSERT INTO public.interacoes (user_id, lead_id, tipo, texto, criado_em)
      VALUES (p_user_id, p_id, 'nota', p_acao->>'texto', agora);
    WHEN 'standby' THEN
      UPDATE public.leads
      SET status = 'standby'
      WHERE id = p_id AND user_id = p_user_id;
      INSERT INTO public.interacoes (user_id, lead_id, tipo, texto, criado_em)
      VALUES (p_user_id, p_id, 'nota', coalesce(texto_acao, 'Lead colocado em Standby. Prazos pausados no Radar.'), agora);
    WHEN 'reativar' THEN
      UPDATE public.leads
      SET status = CASE WHEN lead_atual.orcamento_enviado_em IS NOT NULL THEN 'orcamento_enviado' ELSE 'novo' END,
          ultimo_contato_em = agora
      WHERE id = p_id AND user_id = p_user_id;
      INSERT INTO public.interacoes (user_id, lead_id, tipo, texto, criado_em)
      VALUES (p_user_id, p_id, 'nota', coalesce(texto_acao, 'Lead reativado. Prazos voltam a ser monitorados no Radar.'), agora);
    ELSE
      RAISE EXCEPTION 'Ação de lead inválida';
  END CASE;

  SELECT * INTO lead_atual
  FROM public.leads
  WHERE id = p_id AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'lead', to_jsonb(lead_atual),
    'interacoes', coalesce(
      (SELECT jsonb_agg(to_jsonb(i) ORDER BY i.criado_em DESC, i.id DESC)
       FROM public.interacoes i
       WHERE i.lead_id = p_id AND i.user_id = p_user_id),
      '[]'::jsonb
    )
  );
END;
$$;
