import Script from 'next/script';

import { ThemeRuntime } from '@/components/providers/ThemeRuntime';

/**
 * The purchased template's stylesheets and jQuery plugins.
 *
 * Shared by every storefront-styled route group. The chrome (header, footer,
 * overlays) is *not* here: `layouts/frontend.blade.php` renders it around
 * `@yield('content')`, but the login and register views override the whole
 * `panel` section, so in the original they are full-bleed with no header or
 * footer. The `(auth)` group reproduces that.
 */
export function ThemeAssets() {
  return (
    <>
      <link rel="stylesheet" href="/assets/templates/basic/css/jquery-ui.css" />
      <link rel="stylesheet" href="/assets/templates/basic/css/select2.min.css" />
      <link rel="stylesheet" href="/assets/templates/basic/css/jquery.fancybox.min.css" />
      <link rel="stylesheet" href="/assets/templates/basic/css/slick.css" />
      <link rel="stylesheet" href="/assets/templates/basic/css/main.css" />
      <link rel="stylesheet" href="/assets/templates/basic/css/custom.css" />
      <link rel="stylesheet" href="/assets/vipuri.css" />

      <ThemeRuntime />

      <Script src="/assets/templates/basic/js/jquery.fancybox.js" strategy="afterInteractive" />
      <Script src="/assets/templates/basic/js/select2.min.js" strategy="afterInteractive" />
      <Script src="/assets/templates/basic/js/jquery-ui.js" strategy="afterInteractive" />
      <Script src="/assets/templates/basic/js/slick.min.js" strategy="afterInteractive" />
      <Script src="/assets/templates/basic/js/main.js" strategy="afterInteractive" />
    </>
  );
}
