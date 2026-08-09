import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

import { AppProviders } from '@/components/providers/AppProviders';
import { getSettings } from '@/lib/server';
import { hexToHslParts } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = settings?.site.name ?? process.env.NEXT_PUBLIC_SITE_NAME ?? 'VIPURI';

  return {
    title: {
      default: `${name} — Genuine Auto Parts & Vehicle Accessories in Tanzania`,
      template: `%s | ${name}`,
    },
    description:
      'VIPURI supplies genuine auto parts, spare components and vehicle accessories across Tanzania, ' +
      'with branches in Dar es Salaam, Arusha, Mwanza and Dodoma.',
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000'),
    icons: settings?.site.favicon ? { icon: settings.site.favicon } : { icon: '/assets/images/logo_icon/favicon.svg' },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Root shell.
 *
 * Only the assets both areas need live here — Bootstrap, the icon fonts,
 * toasts and the brand palette. The storefront theme (main.css/custom.css) and
 * the admin theme (app.css) are loaded by their own layouts so their resets
 * never collide, exactly as they were separate in the source system.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  // The purchased theme derives its whole palette from these CSS variables;
  // rendering them here reproduces what the original color.php emitted.
  const base = hexToHslParts(settings?.site.base_color ?? 'FF7A00');
  const secondary = hexToHslParts(settings?.site.secondary_color ?? '6B7A99');

  const paletteCss = `:root{${
    base ? `--base-h:${base.h};--base-s:${base.s}%;--base-l:${base.l}%;` : ''
  }${secondary ? `--secondary-h:${secondary.h};--secondary-s:${secondary.s}%;--secondary-l:${secondary.l}%;` : ''}}`;

  return (
    <html lang="en" itemScope itemType="http://schema.org/WebPage">
      <head>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        <link href="/assets/global/css/bootstrap.min.css" rel="stylesheet" />
        <link href="/assets/global/css/all.min.css" rel="stylesheet" />
        <link rel="stylesheet" href="/assets/global/css/line-awesome.min.css" />
        <link href="/assets/global/css/iziToast.min.css" rel="stylesheet" />
        <link href="/assets/global/css/iziToast_custom.css" rel="stylesheet" />

        <style dangerouslySetInnerHTML={{ __html: paletteCss }} />
      </head>
      <body>
        <AppProviders settings={settings}>{children}</AppProviders>

        {/* jQuery and the Bootstrap bundle back both areas: the storefront theme
            is jQuery-based, and the admin theme uses Bootstrap dropdowns. */}
        <Script src="/assets/global/js/jquery-3.7.1.min.js" strategy="beforeInteractive" />
        <Script src="/assets/global/js/bootstrap.bundle.min.js" strategy="beforeInteractive" />
        <Script src="/assets/global/js/iziToast.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
