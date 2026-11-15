import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompleteInvitationSchema } from '@radar/shared';

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    getUser: vi.fn(),
    refreshSession: vi.fn(),
    updateUserById: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    getProfile: vi.fn()
  }
}));

vi.mock('../db/supabase.js', () => ({
  getSupabaseClient: () => ({
    auth: {
      getUser: mockAuth.getUser,
      admin: { updateUserById: mockAuth.updateUserById }
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockAuth.getProfile })
      })
    })
  }),
  createSupabaseAuthClient: () => ({
    auth: {
      refreshSession: mockAuth.refreshSession,
      resetPasswordForEmail: mockAuth.resetPasswordForEmail
    }
  }),
  getDatabaseProvider: () => 'supabase',
  throwSupabaseError(error: { message: string } | null) {
    if (error) throw new Error(error.message);
  }
}));

import { completePasswordRecovery, requestPasswordReset } from '../services/authService.js';

describe('Supabase password recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });
    mockAuth.refreshSession.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
        session: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        }
      },
      error: null
    });
    mockAuth.updateUserById.mockResolvedValue({ error: null });
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
    mockAuth.getProfile.mockResolvedValue({
      data: { id: 'user-1', email: 'user@example.com', role: 'user' },
      error: null
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts a non-empty Supabase refresh token without an arbitrary length threshold', () => {
    expect(CompleteInvitationSchema.parse({
      accessToken: 'a'.repeat(20),
      refreshToken: 'short',
      novaSenha: 'new-password'
    }).refreshToken).toBe('short');
  });

  it('sends a reset email with the configured login redirect', async () => {
    vi.stubEnv('APP_URL', 'https://checklead.example');

    await requestPasswordReset('person@example.com');

    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', {
      redirectTo: 'https://checklead.example/login'
    });
  });

  it('requires HTTPS for production reset links', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_URL', 'http://checklead.example');

    await expect(requestPasswordReset('person@example.com'))
      .rejects.toThrow('APP_URL deve usar HTTPS em produção.');
    expect(mockAuth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('updates the password and returns a session for the verified user', async () => {
    const result = await completePasswordRecovery('access-token', 'refresh-token', 'new-password');

    expect(mockAuth.updateUserById).toHaveBeenCalledWith('user-1', { password: 'new-password' });
    expect(result).toEqual({
      user: { id: 'user-1', email: 'user@example.com', role: 'user' },
      session: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      }
    });
  });

  it('rejects mismatched access and refresh token users without changing a password', async () => {
    mockAuth.refreshSession.mockResolvedValue({
      data: {
        user: { id: 'user-2' },
        session: {
          access_token: 'other-access-token',
          refresh_token: 'other-refresh-token',
          expires_in: 3600
        }
      },
      error: null
    });

    await expect(
      completePasswordRecovery('access-token', 'refresh-token', 'new-password')
    ).rejects.toThrow('O link de redefinição expirou ou não é válido. Solicite um novo link.');
    expect(mockAuth.updateUserById).not.toHaveBeenCalled();
  });
});
