import { afterEach, describe, expect, it } from 'vitest';
import { getDatabaseProvider, getSupabaseClient } from '../db/supabase.js';

const originalEnvironment = {
  nodeEnv: process.env.NODE_ENV,
  databaseProvider: process.env.DATABASE_PROVIDER,
  supabaseUrl: process.env.SUPABASE_URL,
  secretKey: process.env.SUPABASE_SECRET_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

afterEach(() => {
  restoreEnvironmentVariable('NODE_ENV', originalEnvironment.nodeEnv);
  restoreEnvironmentVariable('DATABASE_PROVIDER', originalEnvironment.databaseProvider);
  restoreEnvironmentVariable('SUPABASE_URL', originalEnvironment.supabaseUrl);
  restoreEnvironmentVariable('SUPABASE_SECRET_KEY', originalEnvironment.secretKey);
  restoreEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', originalEnvironment.serviceRoleKey);
});

describe('database provider configuration', () => {
  it('uses SQLite by default outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DATABASE_PROVIDER;

    expect(getDatabaseProvider()).toBe('sqlite');
  });

  it('requires an explicit durable provider in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_PROVIDER;

    expect(() => getDatabaseProvider()).toThrow('DATABASE_PROVIDER=supabase');
  });

  it('does not allow SQLite in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_PROVIDER = 'sqlite';

    expect(() => getDatabaseProvider()).toThrow('O SQLite não é permitido em produção');
  });

  it('requires the private Supabase credentials on the server', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_PROVIDER = 'supabase';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getSupabaseClient()).toThrow('Configure SUPABASE_URL e SUPABASE_SECRET_KEY');
  });
});

function restoreEnvironmentVariable(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
