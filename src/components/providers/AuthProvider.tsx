'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, USER_TOKEN_KEY, readToken, writeToken } from '@/lib/api';
import { useMounted } from '@/lib/useMounted';
import type { Customer } from '@/types';

type AuthState = {
  user: Customer | null;
  loading: boolean;
  isAuthenticated: boolean;
  setSession: (token: string, user: Customer) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  isAuthenticated: false,
  setSession: () => {},
  refresh: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useMounted();

  const refresh = useCallback(async () => {
    if (!readToken(USER_TOKEN_KEY)) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api<{ user: Customer }>('/auth/me', { auth: 'user' });
      if (mounted()) setUser(data.user);
    } catch {
      // Token expired or revoked — drop it so the UI shows a signed-out state.
      writeToken(USER_TOKEN_KEY, null);
      if (mounted()) setUser(null);
    } finally {
      if (mounted()) setLoading(false);
    }
  }, [mounted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setSession = useCallback((token: string, nextUser: Customer) => {
    writeToken(USER_TOKEN_KEY, token);
    setUser(nextUser);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST', auth: 'user' });
    } catch {
      // Even if the call fails the local session must end.
    }

    writeToken(USER_TOKEN_KEY, null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, isAuthenticated: Boolean(user), setSession, refresh, logout }),
    [user, loading, setSession, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
