import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type DatabaseProvider = 'sqlite' | 'supabase';

let client: SupabaseClient | null = null;

export function getDatabaseProvider(): DatabaseProvider {
  const configuredProvider = process.env.DATABASE_PROVIDER;

  if (!configuredProvider) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_PROVIDER=supabase é obrigatório em produção.');
    }
    return 'sqlite';
  }

  if (configuredProvider !== 'sqlite' && configuredProvider !== 'supabase') {
    throw new Error('DATABASE_PROVIDER deve ser "sqlite" ou "supabase".');
  }

  if (process.env.NODE_ENV === 'production' && configuredProvider !== 'supabase') {
    throw new Error('O SQLite não é permitido em produção. Configure DATABASE_PROVIDER=supabase.');
  }

  return configuredProvider;
}

export function getSupabaseClient(): SupabaseClient {
  if (getDatabaseProvider() !== 'supabase') {
    throw new Error('O provedor de banco configurado não é Supabase.');
  }

  if (client) return client;

  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !secretKey) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_SECRET_KEY no servidor.');
  }

  client = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });

  return client;
}

export async function assertSupabaseSchemaReady(): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('configuracoes')
    .select('id')
    .eq('id', 1)
    .maybeSingle();
  throwSupabaseError(error);
  if (!data) {
    throw new Error('Schema do Supabase não encontrado. Execute a migração SQL antes de iniciar a API.');
  }
}

export function throwSupabaseError(error: { message: string } | null): void {
  if (error) {
    throw new Error(`Erro no Supabase: ${error.message}`);
  }
}
