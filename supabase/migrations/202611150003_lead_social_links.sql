ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS google_meu_negocio text;

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
  responsavel_limpo text := nullif(btrim(p_lead->>'responsavel'), '');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário inválido';
  END IF;

  INSERT INTO public.leads (
    user_id, nome, contato, whatsapp, email, instagram, google_meu_negocio, responsavel,
    servico, origem, valor_estimado, status, criado_em, proxima_acao_em
  ) VALUES (
    p_user_id,
    btrim(p_lead->>'nome'),
    coalesce(nullif(btrim(p_lead->>'contato'), ''), whatsapp_limpo, email_limpo, 'Sem contato'),
    whatsapp_limpo,
    email_limpo,
    instagram_limpo,
    google_meu_negocio_limpo,
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

CREATE OR REPLACE FUNCTION public.importar_leads_em_lote(p_user_id uuid, p_leads jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
  novo_lead public.leads%ROWTYPE;
  agora timestamptz := now();
  total integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário inválido';
  END IF;
  IF jsonb_typeof(p_leads) <> 'array' THEN
    RAISE EXCEPTION 'A lista de leads deve ser um array';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_leads)
  LOOP
    INSERT INTO public.leads (
      user_id, nome, contato, whatsapp, email, instagram, google_meu_negocio, responsavel,
      servico, origem, valor_estimado, status, criado_em, orcamento_enviado_em,
      fechado_em, motivo_perda, proxima_acao_em
    ) VALUES (
      p_user_id,
      btrim(item->>'nome'),
      coalesce(nullif(btrim(item->>'contato'), ''), nullif(btrim(item->>'whatsapp'), ''), nullif(btrim(item->>'email'), ''), 'Sem contato'),
      nullif(btrim(item->>'whatsapp'), ''),
      nullif(btrim(item->>'email'), ''),
      nullif(regexp_replace(btrim(coalesce(item->>'instagram', '')), '^@', ''), ''),
      nullif(btrim(item->>'google_meu_negocio'), ''),
      nullif(btrim(item->>'responsavel'), ''),
      coalesce(nullif(btrim(item->>'servico'), ''), 'Não especificado'),
      coalesce(item->>'origem', 'outro'),
      coalesce((item->>'valor_estimado')::integer, 0),
      coalesce(item->>'status', 'novo'),
      coalesce(nullif(item->>'criado_em', '')::timestamptz, agora),
      nullif(item->>'orcamento_enviado_em', '')::timestamptz,
      nullif(item->>'fechado_em', '')::timestamptz,
      nullif(item->>'motivo_perda', ''),
      nullif(item->>'proxima_acao_em', '')::timestamptz
    )
    RETURNING * INTO novo_lead;

    INSERT INTO public.interacoes (user_id, lead_id, tipo, texto, criado_em)
    VALUES (
      p_user_id,
      novo_lead.id,
      'nota',
      format(
        'Lead importado via planilha CSV. Origem: %s. Responsável: %s.',
        novo_lead.origem,
        coalesce(novo_lead.responsavel, 'Não informado')
      ),
      agora
    );
    total := total + 1;
  END LOOP;

  RETURN jsonb_build_object('totalImportados', total, 'totalIgnorados', 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.restaurar_backup(p_user_id uuid, p_backup jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
  novo_id integer;
  id_antigo integer;
  total_interacoes integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.perfis WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário inválido';
  END IF;
  IF jsonb_typeof(p_backup->'leads') <> 'array' THEN
    RAISE EXCEPTION 'Arquivo de backup inválido: lista de leads ausente';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS backup_lead_map (
    id_antigo integer PRIMARY KEY,
    id_novo integer NOT NULL
  ) ON COMMIT DROP;
  TRUNCATE pg_temp.backup_lead_map;

  DELETE FROM public.interacoes WHERE user_id = p_user_id;
  DELETE FROM public.leads WHERE user_id = p_user_id;

  IF jsonb_typeof(p_backup->'configuracao') = 'object' THEN
    INSERT INTO public.configuracoes (
      user_id, limite_sem_resposta_horas, limite_follow_up_dias,
      limite_lead_parado_dias, atualizado_em
    )
    VALUES (
      p_user_id,
      coalesce((p_backup->'configuracao'->>'limite_sem_resposta_horas')::integer, 24),
      coalesce((p_backup->'configuracao'->>'limite_follow_up_dias')::integer, 3),
      coalesce((p_backup->'configuracao'->>'limite_lead_parado_dias')::integer, 7),
      now()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      limite_sem_resposta_horas = EXCLUDED.limite_sem_resposta_horas,
      limite_follow_up_dias = EXCLUDED.limite_follow_up_dias,
      limite_lead_parado_dias = EXCLUDED.limite_lead_parado_dias,
      atualizado_em = EXCLUDED.atualizado_em;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_backup->'leads')
  LOOP
    INSERT INTO public.leads (
      user_id, nome, contato, whatsapp, email, instagram, google_meu_negocio, responsavel,
      servico, origem, valor_estimado, status, criado_em, ultimo_contato_em,
      orcamento_enviado_em, fechado_em, motivo_perda, proxima_acao_em
    )
    VALUES (
      p_user_id, item->>'nome', item->>'contato', item->>'whatsapp', item->>'email',
      nullif(regexp_replace(btrim(coalesce(item->>'instagram', '')), '^@', ''), ''),
      item->>'google_meu_negocio', item->>'responsavel', item->>'servico', item->>'origem',
      coalesce((item->>'valor_estimado')::integer, 0),
      coalesce(item->>'status', 'novo'),
      coalesce(nullif(item->>'criado_em', '')::timestamptz, now()),
      nullif(item->>'ultimo_contato_em', '')::timestamptz,
      nullif(item->>'orcamento_enviado_em', '')::timestamptz,
      nullif(item->>'fechado_em', '')::timestamptz,
      item->>'motivo_perda',
      nullif(item->>'proxima_acao_em', '')::timestamptz
    )
    RETURNING id INTO novo_id;

    id_antigo := (item->>'id')::integer;
    INSERT INTO pg_temp.backup_lead_map (id_antigo, id_novo)
    VALUES (id_antigo, novo_id);
  END LOOP;

  IF jsonb_typeof(p_backup->'interacoes') = 'array' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(p_backup->'interacoes')
    LOOP
      SELECT id_novo INTO novo_id
      FROM pg_temp.backup_lead_map
      WHERE id_antigo = (item->>'lead_id')::integer;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'O backup contém uma interação sem lead correspondente';
      END IF;

      INSERT INTO public.interacoes (user_id, lead_id, tipo, texto, criado_em)
      VALUES (
        p_user_id,
        novo_id,
        item->>'tipo',
        item->>'texto',
        coalesce(nullif(item->>'criado_em', '')::timestamptz, now())
      );
      total_interacoes := total_interacoes + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'totalLeads', jsonb_array_length(p_backup->'leads'),
    'totalInteracoes', total_interacoes
  );
END;
$$;
