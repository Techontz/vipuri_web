import type { ApiEnvelope } from '@/types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1';

/**
 * The API host, without the `/api/v1` suffix.
 *
 * Needed for the handful of endpoints that are full page navigations rather
 * than XHR — social sign-in redirects and gateway returns.
 */
export function backendUrl(): string {
  const configured = process.env.NEXT_PUBLIC_BACKEND_URL;

  return (configured ?? API_URL.replace(/\/api\/v\d+\/?$/, '')).replace(/\/$/, '');
}

export const CART_TOKEN_KEY = 'vipuri_cart_token';
export const USER_TOKEN_KEY = 'vipuri_user_token';
export const ADMIN_TOKEN_KEY = 'vipuri_admin_token';

/** Thrown for any non-2xx API response so callers can show the real message. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly remark: string,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Which stored token to attach, if any. */
  auth?: 'user' | 'admin' | 'none';
  /** Send the guest cart token (storefront cart, wishlist, checkout). */
  cart?: boolean;
  headers?: Record<string, string>;
  /** Passed through to fetch; server components use this for revalidation. */
  next?: { revalidate?: number; tags?: string[] };
  cache?: RequestCache;
  signal?: AbortSignal;
};

const isBrowser = () => typeof window !== 'undefined';

export function readToken(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeToken(key: string, value: string | null) {
  if (!isBrowser()) return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* Private browsing with storage disabled — the session simply won't persist. */
  }
}

/**
 * A stable, opaque identifier for a guest's cart. It is generated once per
 * browser and sent as X-Cart-Token so guests keep their basket, wishlist and
 * checkout state without a server session.
 */
export function cartToken(): string {
  if (!isBrowser()) return '';

  let token = readToken(CART_TOKEN_KEY);

  if (!token) {
    token =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `cart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    writeToken(CART_TOKEN_KEY, token);
  }

  return token;
}

function firstMessage(payload: Partial<ApiEnvelope<unknown>> | null, fallback: string): string {
  const errors = payload?.message?.error;
  if (errors?.length) return errors[0];
  const success = payload?.message?.success;
  if (success?.length) return success[0];
  return fallback;
}

/**
 * Call the VIPURI API and unwrap the standard envelope.
 * Throws {@link ApiError} on failure so UI code can `try/catch` once.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = 'none', cart = false, headers = {}, next, cache, signal } = options;

  const requestHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (body !== undefined && !isFormData) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (auth === 'user') {
    const token = readToken(USER_TOKEN_KEY);
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (auth === 'admin') {
    const token = readToken(ADMIN_TOKEN_KEY);
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (cart) {
    // An authenticated customer is identified by their bearer token; guests by
    // the cart token. Sending both is harmless — the API prefers the account.
    const token = cartToken();
    if (token) requestHeaders['X-Cart-Token'] = token;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    cache: cache ?? (next ? undefined : 'no-store'),
    next,
    signal,
  });

  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.status === 'error') {
    throw new ApiError(
      firstMessage(payload, `Request failed with status ${response.status}`),
      response.status,
      payload?.remark ?? 'error',
      payload?.errors ?? {},
    );
  }

  return (payload?.data ?? ({} as T)) as T;
}

/** Same as {@link api} but returns the success message too, for toasts. */
export async function apiWithMessage<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; message: string }> {
  const { method = 'GET', body, auth = 'none', cart = false, headers = {} } = options;

  const requestHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (body !== undefined && !isFormData) requestHeaders['Content-Type'] = 'application/json';
  if (auth === 'user') {
    const token = readToken(USER_TOKEN_KEY);
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }
  if (auth === 'admin') {
    const token = readToken(ADMIN_TOKEN_KEY);
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }
  if (cart) requestHeaders['X-Cart-Token'] = cartToken();

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    cache: 'no-store',
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.status === 'error') {
    throw new ApiError(
      firstMessage(payload, `Request failed with status ${response.status}`),
      response.status,
      payload?.remark ?? 'error',
      payload?.errors ?? {},
    );
  }

  return {
    data: (payload?.data ?? ({} as T)) as T,
    message: firstMessage(payload, 'Done'),
  };
}

/**
 * Fetch an authenticated file and save it.
 *
 * Invoices and support attachments are not on a public path — they are streamed
 * by the API behind an ownership check — so they cannot be plain `<a download>`
 * links and need the bearer token attached.
 */
export async function downloadFile(
  path: string,
  filename: string,
  auth: 'user' | 'admin' = 'user',
): Promise<void> {
  const token = readToken(auth === 'admin' ? ADMIN_TOKEN_KEY : USER_TOKEN_KEY);

  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new ApiError('That file could not be downloaded', response.status, 'download_failed');
  }

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/** Build a query string, dropping empty values so URLs stay clean. */
export function query(params: Record<string, unknown>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') search.append(`${key}[]`, String(item));
      });
      return;
    }

    search.append(key, String(value));
  });

  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
