import type { Metadata } from 'next';
import Script from 'next/script';

import { AdminProvider } from '@/components/admin/AdminProviders';
import { AdminGate } from '@/components/admin/AdminGate';

export const metadata: Metadata = {
  title: { default: 'VIPURI Admin', template: '%s | VIPURI Admin' },
  robots: { index: false, follow: false },
};

/**
 * Admin area. Loads the purchased admin theme's stylesheet so the panel keeps
 * the original look, and wraps every page in the staff session provider.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/assets/admin/css/reset.css" />
      <link rel="stylesheet" href="/assets/admin/css/vendor/bootstrap-toggle.min.css" />
      <link rel="stylesheet" href="/assets/admin/css/app.css" />
      <link rel="stylesheet" href="/assets/vipuri-admin.css" />

      <AdminProvider>
        <AdminGate>{children}</AdminGate>
      </AdminProvider>

      <Script src="/assets/admin/js/vendor/apexcharts.min.js" strategy="afterInteractive" />
    </>
  );
}
