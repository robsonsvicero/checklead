import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import type { AuthStatus, AuthUser } from '@radar/shared';

interface AuthContextType {
  hasUser: boolean;
  authenticated: boolean;
  provider: AuthStatus['provider'];
  user: AuthUser | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  login: (credentials: { email?: string; senha: string }) => Promise<void>;
  setup: (senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasUser, setHasUser] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [provider, setProvider] = useState<AuthStatus['provider']>('sqlite');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<AuthStatus>('/auth/status');
      setHasUser(data.hasUser);
      setAuthenticated(data.authenticated);
      setProvider(data.provider);
      setUser(data.user);
    } catch (err) {
      console.error('Falha ao verificar status de autenticação:', err);
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials: { email?: string; senha: string }) => {
    await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    await checkAuth();
  };

  const setup = async (senha: string) => {
    await apiFetch('/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ senha })
    });
    await checkAuth();
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setAuthenticated(false);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ hasUser, authenticated, provider, user, loading, checkAuth, login, setup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
