'use client';

import { createContext, useContext, useMemo } from 'react';

import { AuthProvider } from '@/components/providers/AuthProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import type { SiteSettings } from '@/types';

const SettingsContext = createContext<SiteSettings | null>(null);

export function useSettings() {
  return useContext(SettingsContext);
}

export function AppProviders({
  settings,
  children,
}: {
  settings: SiteSettings | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => settings, [settings]);

  return (
    <SettingsContext.Provider value={value}>
      <LanguageProvider defaultCode={settings?.languages?.find((l) => l.is_default)?.code ?? 'en'}>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </SettingsContext.Provider>
  );
}
