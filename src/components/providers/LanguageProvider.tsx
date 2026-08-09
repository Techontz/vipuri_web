'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';
import { useMounted } from '@/lib/useMounted';

const STORAGE_KEY = 'vipuri_language';

type LanguageState = {
  /** Active language code, e.g. `en` or `sw`. */
  code: string;
  /** Translate a source string; returns it unchanged when untranslated. */
  t: (text: string) => string;
  choose: (code: string) => void;
};

const LanguageContext = createContext<LanguageState | null>(null);

/**
 * Storefront translations, replacing Blade's `@lang()`.
 *
 * Keys are the English source strings, exactly as the original used them, so a
 * string an administrator has not translated yet renders in English instead of
 * showing an identifier. The default language needs no map at all.
 */
export function useLanguage(): LanguageState {
  const context = useContext(LanguageContext);

  if (!context) {
    // Rendered outside the provider (e.g. the admin panel) — pass text through.
    return { code: 'en', t: (text: string) => text, choose: () => undefined };
  }

  return context;
}

/** Shorthand for the common case of only needing the translate function. */
export function useTranslate(): (text: string) => string {
  return useLanguage().t;
}

export function LanguageProvider({
  defaultCode,
  children,
}: {
  defaultCode: string;
  children: React.ReactNode;
}) {
  const [code, setCode] = useState(defaultCode);
  const [strings, setStrings] = useState<Record<string, string>>({});
  const mounted = useMounted();

  // Restore the visitor's choice. Deliberately after hydration: the server has
  // no way to know it, and rendering a different language than the server sent
  // would be a hydration mismatch.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== code) setCode(stored);
    } catch {
      /* Storage unavailable — the default language stands. */
    }
    // Only on mount: later changes come from choose().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (code === defaultCode) {
      setStrings({});
      return;
    }

    api<{ strings: Record<string, string> }>(`/translations/${code}`, { cache: 'force-cache' })
      .then((data) => {
        if (mounted()) setStrings(data.strings ?? {});
      })
      .catch(() => {
        // Fall back to the source language rather than showing nothing.
        if (mounted()) setStrings({});
      });
  }, [code, defaultCode, mounted]);

  const choose = useCallback((next: string) => {
    setCode(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Choice will not persist, but this session honours it. */
    }
  }, []);

  const value = useMemo<LanguageState>(
    () => ({
      code,
      choose,
      t: (text: string) => strings[text] ?? text,
    }),
    [code, choose, strings],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
