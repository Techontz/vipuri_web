'use client';

import { usePathname } from 'next/navigation';

import { AdminShell } from '@/components/admin/AdminShell';

/**
 * The sign-in and password-recovery screens render outside the panel chrome;
 * everything else goes through {@link AdminShell}, which enforces the session.
 */
const BARE_ROUTES = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];

export function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (BARE_ROUTES.some((route) => pathname.startsWith(route))) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
