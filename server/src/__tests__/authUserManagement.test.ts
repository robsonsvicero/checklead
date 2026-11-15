import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetProfile, mockCountAdmins, mockDeleteAuthUser } = vi.hoisted(() => ({
  mockGetProfile: vi.fn(),
  mockCountAdmins: vi.fn(),
  mockDeleteAuthUser: vi.fn()
}));

vi.mock('../db/supabase.js', () => ({
  getSupabaseClient: () => ({
    auth: { admin: { deleteUser: mockDeleteAuthUser } },
    from: () => ({
      select: () => ({
        eq: (column: string) => column === 'id'
          ? { maybeSingle: mockGetProfile }
          : mockCountAdmins()
      })
    })
  }),
  getDatabaseProvider: () => 'supabase',
  throwSupabaseError(error: { message: string } | null) {
    if (error) throw new Error(error.message);
  }
}));

import { deleteUserAccount } from '../services/authService.js';

describe('admin user deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProfile.mockResolvedValue({
      data: { id: 'target-user', role: 'user' },
      error: null
    });
    mockCountAdmins.mockResolvedValue({ count: 2, error: null });
    mockDeleteAuthUser.mockResolvedValue({ error: null });
  });

  it('deletes another user through Supabase Auth', async () => {
    await deleteUserAccount('target-user', 'admin-user');

    expect(mockDeleteAuthUser).toHaveBeenCalledWith('target-user');
  });

  it('does not allow deleting the authenticated account', async () => {
    await expect(deleteUserAccount('admin-user', 'admin-user'))
      .rejects.toThrow('Não é permitido excluir a própria conta.');
    expect(mockDeleteAuthUser).not.toHaveBeenCalled();
  });

  it('does not allow deleting the last administrator', async () => {
    mockGetProfile.mockResolvedValue({
      data: { id: 'target-user', role: 'admin' },
      error: null
    });
    mockCountAdmins.mockResolvedValue({ count: 1, error: null });

    await expect(deleteUserAccount('target-user', 'admin-user'))
      .rejects.toThrow('Não é possível excluir o último administrador.');
    expect(mockDeleteAuthUser).not.toHaveBeenCalled();
  });
});
