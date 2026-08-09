'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ADMIN_TOKEN_KEY, api, readToken, writeToken } from '@/lib/api';
import type { StaffMember } from '@/types';

type AdminState = {
  admin: StaffMember | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** True when the signed-in staff member holds the permission. */
  can: (permission: string) => boolean;
  isSuperAdmin: boolean;
  branchId: number | null;
  setSession: (token: string, admin: StaffMember) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AdminContext = createContext<AdminState>({
  admin: null,
  loading: true,
  isAuthenticated: false,
  can: () => false,
  isSuperAdmin: false,
  branchId: null,
  setSession: () => {},
  refresh: async () => {},
  logout: async () => {},
});

export function useAdmin() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!readToken(ADMIN_TOKEN_KEY)) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api<{ admin: StaffMember }>('/admin/auth/me', { auth: 'admin' });
      setAdmin(data.admin);
    } catch {
      writeToken(ADMIN_TOKEN_KEY, null);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setSession = useCallback((token: string, next: StaffMember) => {
    writeToken(ADMIN_TOKEN_KEY, token);
    setAdmin(next);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/admin/auth/logout', { method: 'POST', auth: 'admin' });
    } catch {
      // Local sign-out must happen regardless.
    }

    writeToken(ADMIN_TOKEN_KEY, null);
    setAdmin(null);
  }, []);

  const value = useMemo<AdminState>(() => {
    const permissions = new Set(admin?.permissions ?? []);

    return {
      admin,
      loading,
      isAuthenticated: Boolean(admin),
      // Navigation and controls are hidden by permission for usability; the
      // API enforces the same rules independently on every request.
      can: (permission: string) => Boolean(admin?.is_super_admin) || permissions.has(permission),
      isSuperAdmin: Boolean(admin?.is_super_admin),
      branchId: admin?.branch_id ?? null,
      setSession,
      refresh,
      logout,
    };
  }, [admin, loading, setSession, refresh, logout]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
