'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

declare global {
  interface Window {
    VipuriTheme?: { init: () => void; destroySliders: () => void };
    jQuery?: unknown;
  }
}

/**
 * Re-applies the purchased theme's jQuery behaviour after every client-side
 * navigation.
 *
 * The original template ran `main.js` once on document-ready; in an SPA the
 * DOM is replaced without a reload, so sliders, select2 boxes, fancybox
 * galleries and the sticky header must be re-initialised. Every initialiser in
 * `main.js` is idempotent, so calling init() repeatedly is safe.
 */
function ThemeRuntimeInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    const apply = () => {
      if (cancelled) return;
      window.VipuriTheme?.init();

      // The preloader only ever runs on the first paint.
      document.querySelectorAll('.preloader').forEach((el) => el.classList.add('d-none'));
    };

    // Wait for the theme bundle to finish loading on a cold start.
    if (window.VipuriTheme) {
      const id = window.requestAnimationFrame(apply);
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(id);
      };
    }

    const interval = window.setInterval(() => {
      if (window.VipuriTheme) {
        window.clearInterval(interval);
        apply();
      }
    }, 80);

    const timeout = window.setTimeout(() => window.clearInterval(interval), 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [pathname, searchParams]);

  // Keep `--header-height` in step with the header's real height.
  //
  // main.js measures the header once per init(). Coming from the full-bleed
  // login/register screens, the storefront stylesheets are still loading at
  // that moment, so it measured an unstyled, far taller header and
  // `.page-wrapper` was pushed down by hundreds of pixels of blank space.
  // Re-measuring whenever the header resizes corrects that as soon as the
  // styles land. The fixed (scrolled) header hides its top bar, so it is not
  // measured — the offset belongs to the header at rest, as in the original.
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.header');
    if (!header || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      if (header.classList.contains('fixed-header')) return;
      document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(header);
    measure();

    return () => observer.disconnect();
  }, [pathname]);

  // Close any open offcanvas/modal when the route changes, otherwise the
  // backdrop survives navigation and blocks the page.
  useEffect(() => {
    document.querySelectorAll('.offcanvas.show, .modal.show').forEach((el) => {
      el.classList.remove('show');
      el.setAttribute('aria-hidden', 'true');
    });
    document.querySelectorAll('.offcanvas-backdrop, .modal-backdrop').forEach((el) => el.remove());
    document.body.classList.remove('modal-open', 'offcanvas-backdrop');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }, [pathname]);

  return null;
}

export function ThemeRuntime() {
  return (
    <Suspense fallback={null}>
      <ThemeRuntimeInner />
    </Suspense>
  );
}
