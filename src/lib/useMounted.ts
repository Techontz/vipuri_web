'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a predicate for "is this component still on the page?".
 *
 * Storefront loaders are `useCallback`s that both an effect and a user action
 * can start, so a plain `let cancelled` inside one effect does not cover them.
 * Call this before any `setState` that follows an `await`: navigating away mid
 * request is normal, and React warns when the response lands afterwards.
 */
export function useMounted(): () => boolean {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  return useCallback(() => mounted.current, []);
}
