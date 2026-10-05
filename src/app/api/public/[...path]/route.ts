import { API_URL, staticMediaUrls } from '@/lib/env';
import { publicCacheSeconds } from '@/lib/public-cache';

/**
 * Same-origin, CDN-cached copy of the API's public read endpoints.
 *
 * The browser used to call the Laravel API directly for catalogue data, and
 * every visitor paid the full round trip to the origin server (2–5 s each,
 * and much longer while it was busy). Routed through here, a response is
 * cached at the Vercel edge closest to the visitor and served in
 * milliseconds; `stale-while-revalidate` refreshes it in the background so
 * nobody waits for the origin. Only anonymous GETs on the allow-list in
 * `public-cache.ts` are served — anything personal (cart, account, admin,
 * checkout) never comes through this route.
 */
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const endpoint = `/${path.map(encodeURIComponent).join('/')}`;
  const ttl = publicCacheSeconds(endpoint);

  if (ttl === null) {
    return Response.json({ status: 'error', message: { error: ['Not found'] } }, { status: 404 });
  }

  const { search } = new URL(request.url);

  try {
    const upstream = await fetch(`${API_URL}${endpoint}${search}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: ttl },
    });
    const body = staticMediaUrls(await upstream.text());

    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': upstream.ok
          ? `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${ttl * 12}`
          : 'no-store',
      },
    });
  } catch {
    return Response.json(
      { status: 'error', message: { error: ['The store is temporarily unreachable'] } },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
