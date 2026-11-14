import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import { AuthStatus } from '@radar/shared';

interface AuthContextType {
  hasUser: boolean;
  authenticated: boolean;
  loading: boolean;
  checkAuth: () => Promise<void>;
  login: (senha: string) => Promise<void>;
  setup: (senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasUser, setHasUser] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<AuthStatus>('/auth/status');
      setHasUser(data.hasUser);
      setAuthenticated(data.authenticated);
    } catch (err) {
      console.error('Falha ao verificar status de autenticação:', err);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (senha: string) => {
    await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ senha })
    });
    setAuthenticated(true);
  };

  const setup = async (senha: string) => {
    await apiFetch('/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ senha })
    });
    setHasUser(true);
    setAuthenticated(true);
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ hasUser, authenticated, loading, checkAuth, login, setup, logout }}>
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
