'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useSettings } from '@/components/providers/AppProviders';

const STORAGE_KEY = 'vipuri_gdpr_cookie';

/**
 * GDPR notice, mirroring the `cookies-card` block in `layouts/app.blade.php`.
 *
 * The original recorded consent in a `gdpr_cookie` cookie set by the server.
 * With a static frontend there is nothing to set it, so consent is kept in
 * localStorage — same behaviour for the visitor, one fewer round trip.
 *
 * The card is rendered with `.hide` and revealed on the next frame so it slides
 * up the way the theme's transition intends, and so it never flashes for a
 * visitor who has already accepted.
 */
export function CookieConsent() {
  const settings = useSettings();
  const cookie = settings?.cookie ?? null;

  const [needed, setNeeded] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!cookie) return;

    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'accepted') return;
    } catch {
      // Private browsing with storage disabled: show the notice each visit
      // rather than suppress it.
    }

    setNeeded(true);
    const timer = window.setTimeout(() => setShown(true), 400);

    return () => window.clearTimeout(timer);
  }, [cookie]);

  if (!cookie || !needed) return null;

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // Nothing to persist to; hiding the card for this session is enough.
    }

    setShown(false);
    window.setTimeout(() => setNeeded(false), 600);
  };

  return (
    <div className={`cookies-card text-center ${shown ? '' : 'hide'}`}>
      <div className="cookies-card__icon bg--base">
        <i className="las la-cookie-bite" />
      </div>
      <p className="mt-4 cookies-card__content">
        {cookie.short_desc}{' '}
        <Link href="/cookie-policy" target="_blank" className="text--base">
          learn more
        </Link>
      </p>
      <div className="cookies-card__btn mt-4">
        <button type="button" className="btn btn--base w-100 policy" onClick={accept}>
          Allow
        </button>
      </div>
    </div>
  );
}
