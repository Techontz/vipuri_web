'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useSettings } from '@/components/providers/AppProviders';

const STORAGE_KEY = 'vipuri_gdpr_cookie';

/**
 * Cookie notice.
 *
 * The original recorded consent in a `gdpr_cookie` cookie set by the server.
 * With a static frontend there is nothing to set it, so consent is kept in
 * localStorage — same behaviour for the visitor, one fewer round trip.
 *
 * The site only sets the cookies it needs to run (session, cart, language), so
 * there is a single "Accept" rather than a set of categories that would not
 * change anything. The card is mounted hidden and revealed on the next frame
 * so it eases in (vipuri-site.css; motion is dropped for reduced-motion
 * users) and never flashes for a visitor who has already accepted.
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

    // Mount hidden, then reveal on the following frame so the transition runs.
    let frame = 0;
    const timer = window.setTimeout(() => {
      setNeeded(true);
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => setShown(true));
      });
    }, 400);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [cookie]);

  if (!cookie || !needed) return null;

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // Nothing to persist to; hiding the card for this session is enough.
    }

    setShown(false);
    window.setTimeout(() => setNeeded(false), 400);
  };

  return (
    <div
      className={`vp-cookie${shown ? ' is-visible' : ''}`}
      role="region"
      aria-label="Cookie notice"
      aria-hidden={!shown}
    >
      <div className="vp-cookie__icon" aria-hidden="true">
        <i className="las la-cookie-bite" />
      </div>
      <div className="vp-cookie__body">
        <p className="vp-cookie__title">We use cookies</p>
        <p className="vp-cookie__text">
          {cookie.short_desc ||
            'We use essential cookies to keep you signed in, remember your cart and make the shop work.'}{' '}
          <Link href="/cookie-policy" className="vp-cookie__link">
            Cookie policy
          </Link>
        </p>
      </div>
      <button type="button" className="vp-cookie__btn" onClick={accept} tabIndex={shown ? 0 : -1}>
        Accept
      </button>
    </div>
  );
}
