import 'server-only';

import { API_URL } from '@/lib/api';
import type { ApiEnvelope, HomePayload, ProductDetail, SiteSettings } from '@/types';

/**
 * Server-side fetch helpers used by React Server Components.
 *
 * These never throw: a storefront page must still render (with an empty state)
 * when the API is briefly unavailable, exactly as the original did.
 */
async function serverGet<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as ApiEnvelope<T>;

    return payload.status === 'success' ? payload.data : null;
  } catch {
    return null;
  }
}

export function getSettings(): Promise<SiteSettings | null> {
  return serverGet<SiteSettings>('/settings', 300);
}

export function getHome(): Promise<HomePayload | null> {
  return serverGet<HomePayload>('/home', 60);
}

export function getProduct(slug: string) {
  return serverGet<{ product: ProductDetail; related_products: unknown[] }>(
    `/products/${encodeURIComponent(slug)}`,
    30,
  );
}

export { serverGet };
