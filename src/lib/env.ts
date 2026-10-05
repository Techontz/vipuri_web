/**
 * Where the storefront and dashboard talk to, in one place.
 *
 * Every value comes from a NEXT_PUBLIC_* environment variable and falls back
 * to the live VIPURI deployment, so a build without an .env file still points
 * at production — never at a developer's machine. To work against a local
 * backend, set the variables in .env.local (see .env.example).
 */

const LIVE_BACKEND = 'https://api.vipuri.co.tz';
const LIVE_SITE = 'https://www.vipuri.co.tz';

const trim = (value: string) => value.replace(/\/+$/, '');

/** Laravel API base, including the version prefix. */
export const API_URL = trim(process.env.NEXT_PUBLIC_API_URL || `${LIVE_BACKEND}/api/v1`);

/** Laravel origin (no /api/v1) — media URLs and full-page redirects. */
export const BACKEND_URL = trim(process.env.NEXT_PUBLIC_BACKEND_URL || API_URL.replace(/\/api\/v\d+$/, ''));

/** Public storefront origin, for canonical links and metadata. */
export const SITE_URL = trim(process.env.NEXT_PUBLIC_SITE_URL || LIVE_SITE);
