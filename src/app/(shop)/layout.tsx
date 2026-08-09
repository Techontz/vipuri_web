import { CookieConsent } from '@/components/layout/CookieConsent';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ThemeAssets } from '@/components/layout/ThemeAssets';
import { MaintenancePage } from '@/components/site/MaintenancePage';
import { getSettings } from '@/lib/server';

/**
 * Storefront shell.
 *
 * Reproduces the chrome from `layouts/frontend.blade.php`: preloader,
 * overlays, scroll-to-top, header, page body, footer.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const closed = Boolean(settings?.site.maintenance_mode);

  return (
    <>
      <ThemeAssets />

      <div className="preloader">
        <div className="loader">
          <svg viewBox="0 0 100 100">
            <defs>
              <filter id="preloaderShadow">
                <feDropShadow floodColor="#000" stdDeviation="1.5" dy="0" dx="0" />
              </filter>
            </defs>
            <circle r="45" cy="50" cx="50" id="spinner" />
          </svg>
        </div>
      </div>

      <div className="body-overlay" />
      <div className="sidebar-overlay" />

      <a className="scroll-top" href="#top" aria-label="Scroll to top">
        <i className="fas fa-angle-double-up" />
      </a>

      <SiteHeader />
      {/* `page-wrapper` is load-bearing, not decorative: `.header` is
          position:absolute, and the theme offsets the page below it with
          `.page-wrapper { margin-top: var(--header-height) }`, the variable
          being measured from the rendered header by main.js. Without the class
          the offset never applies and the header sits on top of the content.
          `layouts/frontend.blade.php` has it for the same reason.

          While the shop is closed every storefront route shows the notice
          instead of its own content, as the original's middleware did. */}
      <main className="page-wrapper">
        {closed ? <MaintenancePage content={settings?.maintenance ?? null} /> : children}
      </main>
      <SiteFooter />

      <CookieConsent />
    </>
  );
}
