import { backendUrl } from '@/lib/api';
/**
 * Presentation helpers. Currency formatting is centralised here so every
 * screen shows the same "TZS 1,500,000" shape the backend produces.
 */

export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'TZS';

/**
 * Format a monetary value in Tanzanian Shillings.
 * TZS is not used with sub-units, so amounts are whole shillings by default.
 */
export function showAmount(
  amount: number | string | null | undefined,
  options: { decimals?: number; withCurrency?: boolean } = {},
): string {
  const { decimals = 0, withCurrency = true } = options;
  const value = Number(amount ?? 0);
  const safe = Number.isFinite(value) ? value : 0;

  const formatted = safe.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return withCurrency ? `${CURRENCY} ${formatted}` : formatted;
}

/** Compact form for dashboard tiles: TZS 1.5M, TZS 240K. */
export function showCompactAmount(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);

  if (!Number.isFinite(value)) return `${CURRENCY} 0`;
  if (Math.abs(value) >= 1_000_000) return `${CURRENCY} ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${CURRENCY} ${(value / 1_000).toFixed(0)}K`;

  return `${CURRENCY} ${value.toFixed(0)}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-US');
}

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return '';

  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return '';

  const seconds = Math.floor((Date.now() - date) / 1000);

  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [604800, 'day'],
    [2629800, 'week'],
    [31557600, 'month'],
  ];

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (seconds < 60) return formatter.format(-seconds, 'second');

  for (let i = 1; i < units.length; i++) {
    const [limit, unit] = units[i];
    if (seconds < limit) {
      const divisor = units[i - 1][0];
      return formatter.format(-Math.floor(seconds / divisor), unit);
    }
  }

  return formatter.format(-Math.floor(seconds / 31557600), 'year');
}

/** Placeholder used whenever a record has no uploaded image. */
export const PLACEHOLDER_IMAGE = '/assets/images/default.png';

/**
 * The one place an API media value becomes a loadable `src`.
 *
 * The API returns absolute URLs built from the server's own APP_URL, so this
 * normally passes them straight through. It handles the shapes that would
 * otherwise render as a broken image or fall back to the placeholder and look
 * like missing photography: a relative path from the backend, and a
 * protocol-relative `//host`.
 *
 * The placeholder itself is an asset of this site, not the API's, so an empty
 * value returns before any backend prefix is applied.
 */
export function imageUrl(value: string | null | undefined): string {
  const raw = value?.trim();

  if (!raw) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;

  // Already one of our own static assets.
  if (raw.startsWith('/assets/')) return raw;

  const base = backendUrl();
  return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`;
}

/** Strip HTML for meta descriptions and card excerpts. */
export function plainText(html: string | null | undefined, limit = 160): string {
  if (!html) return '';

  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length <= limit ? text : `${text.slice(0, limit).trimEnd()}…`;
}

/** Turn "#FF7A00" into the H S% L% triple the theme's CSS variables expect. */
export function hexToHslParts(hex: string | null | undefined): { h: number; s: number; l: number } | null {
  if (!hex) return null;

  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;

  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;

  let h = 0;
  if (delta !== 0) {
    if (cmax === r) h = (g - b) / delta;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (cmax + cmin) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}
