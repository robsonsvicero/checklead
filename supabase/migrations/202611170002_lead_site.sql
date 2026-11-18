ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS site text;

CREATE OR REPLACE FUNCTION public.criar_lead_atomic(p_user_id uuid, p_lead jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  novo_lead public.leads%ROWTYPE;
  agora timestamptz := now();
  whatsapp_limpo text := nullif(btrim(p_lead->>'whatsapp'), '');
  email_limpo text := nullif(btrim(p_lead->>'email'), '');
  instagram_limpo text := nullif(regexp_replace(btrim(coalesce(p_lead->>'instagram', '')), '^@', ''), '');
  google_meu_negocio_limpo text := nullif(btrim(p_lead->>'google_meu_negocio'), '');
  site_limpo text := nullif(btrim(p_lead->>'site'), '');
  responsavel_limpo text := nullif(btrim(p_lead->>'responsavel'), '');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário inválido';
  END IF;

  INSERT INTO public.leads (
    user_id, nome, contato, whatsapp, email, instagram, google_meu_negocio, site, responsavel,
    servico, origem, valor_estimado, status, criado_em, proxima_acao_em
  ) VALUES (
    p_user_id,
    btrim(p_lead->>'nome'),
    coalesce(nullif(btrim(p_lead->>'contato'), ''), whatsapp_limpo, email_limpo, 'Sem contato'),
    whatsapp_limpo,
    email_limpo,
    instagram_limpo,
    google_meu_negocio_limpo,
    site_limpo,
    responsavel_limpo,
    btrim(p_lead->>'servico'),
    p_lead->>'origem',
    coalesce((p_lead->>'valor_estimado')::integer, 0),
    'novo',
    agora,
    nullif(p_lead->>'proxima_acao_em', '')::timestamptz
  )
  RETURNING * INTO novo_lead;

  INSERT INTO public.interacoes (user_id, lead_id, tipo, texto, criado_em)
  VALUES (
    p_user_id,
    novo_lead.id,
    'nota',
    format(
      'Lead criado no Radar via %s. Responsável: %s. Serviço: %s.',
      novo_lead.origem,
      coalesce(responsavel_limpo, 'Não definido'),
      novo_lead.servico
    ),
    agora
  );

  RETURN to_jsonb(novo_lead);
END;
$$;
