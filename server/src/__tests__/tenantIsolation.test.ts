import { beforeEach, describe, expect, it, vi } from 'vitest';

const { records } = vi.hoisted(() => ({
  records: {
    leads: [] as Array<Record<string, unknown>>,
    interacoes: [] as Array<Record<string, unknown>>
  }
}));

vi.mock('../db/supabase.js', () => ({
  getDatabaseProvider: () => 'supabase',
  getSupabaseClient: () => ({
    from(table: 'leads' | 'interacoes') {
      const filters: Array<[string, unknown]> = [];
      const tableRows = records[table];
      const query = {
        select() {
          return query;
        },
        eq(column: string, value: unknown) {
          filters.push([column, value]);
          return query;
        },
        order() {
          const data = tableRows.filter(row =>
            filters.every(([column, value]) => row[column] === value)
          );
          return Promise.resolve({ data, error: null });
        },
        maybeSingle() {
          const data = tableRows.find(row =>
            filters.every(([column, value]) => row[column] === value)
          ) || null;
          return Promise.resolve({ data, error: null });
        }
      };
      return query;
    }
  }),
  throwSupabaseError(error: { message: string } | null) {
    if (error) throw new Error(error.message);
  }
}));

import { listarLeads, obterLeadPorId } from '../services/leadService.js';

describe('Supabase tenant isolation', () => {
  beforeEach(() => {
    records.leads = [
      { id: 1, user_id: 'user-a', nome: 'Lead A', valor_estimado: 100 },
      { id: 2, user_id: 'user-b', nome: 'Lead B', valor_estimado: 200 }
    ];
    records.interacoes = [
      { id: 1, user_id: 'user-a', lead_id: 1, texto: 'Nota A' },
      { id: 2, user_id: 'user-b', lead_id: 2, texto: 'Nota B' }
    ];
  });

  it('lists only the authenticated user leads', async () => {
    const leads = await listarLeads({}, 'user-a');

    expect(leads.map(lead => lead.nome)).toEqual(['Lead A']);
  });

  it('does not expose another user lead or its interactions by ID', async () => {
    const lead = await obterLeadPorId(2, 'user-a');

    expect(lead).toBeNull();
  });
});
