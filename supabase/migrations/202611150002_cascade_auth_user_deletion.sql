ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_user_id_fkey;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.interacoes
  DROP CONSTRAINT IF EXISTS interacoes_user_id_fkey;
ALTER TABLE public.interacoes
  ADD CONSTRAINT interacoes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.configuracoes
  DROP CONSTRAINT IF EXISTS configuracoes_user_id_fkey;
ALTER TABLE public.configuracoes
  ADD CONSTRAINT configuracoes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
