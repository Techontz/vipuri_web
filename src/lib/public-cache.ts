/**
 * Public, anonymous API reads that may be served from the CDN, and for how
 * long (seconds). Shared by the caching route (`app/api/public`) and the API
 * client, which sends matching browser requests through it.
 *
 * Product data is kept short so prices and stock stay current; reference
 * data (settings, categories, brands, branches, CMS) changes rarely.
 */
const RULES: [RegExp, number][] = [
  [/^\/products(\/vehicle-filters)?$/, 60],
  [/^\/products\/[^/]+(\/quick-view|\/reviews)?$/, 60],
  [/^\/(settings|home|offers|branches)$/, 300],
  [/^\/categories(\/[^/]+)?$/, 300],
  [/^\/brands(\/[^/]+)?$/, 300],
  [/^\/blogs(\/[^/]+)?$/, 300],
  [/^\/(pages|policy|translations)\/[^/]+$/, 300],
];

export function publicCacheSeconds(endpoint: string): number | null {
  const path = endpoint.split('?')[0];
  return RULES.find(([pattern]) => pattern.test(path))?.[1] ?? null;
}
