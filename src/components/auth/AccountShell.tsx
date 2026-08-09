'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { SocialAuth } from '@/components/auth/SocialAuth';
import { useSettings } from '@/components/providers/AppProviders';
import { api } from '@/lib/api';

type AccountCms = {
  title?: string;
  subtitle?: string;
  short_description?: string;
  trusted_text?: string;
  background_image?: string;
  user_image?: string;
};

/**
 * Split-screen shell used by every account screen (login, register, password
 * reset), mirroring the theme's `.account` layout.
 */
export function AccountShell({
  section,
  heading,
  description,
  footer,
  children,
}: {
  section: 'login' | 'register';
  heading: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const settings = useSettings();
  const [cms, setCms] = useState<AccountCms>({});

  useEffect(() => {
    let cancelled = false;

    // The account artwork and copy live in the CMS, exactly as in the source.
    api<{ sections: Record<string, AccountCms> }>('/home', { cache: 'force-cache' })
      .then((data) => {
        if (!cancelled) setCms((data.sections?.[`${section}.content`] as AccountCms) ?? {});
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [section]);

  const background = cms.background_image;

  return (
    <section className="account">
      <div
        className="account-thumb bg-img"
        data-background-image={background}
        style={background ? { backgroundImage: `url(${background})` } : undefined}
      >
        <div className="account-thumb__body">
          <div className="account-thumb-heading">
            <h2 className="account-thumb-heading__title">{cms.title ?? 'Upgrade Every Drive'}</h2>
            <p className="account-thumb-heading__desc">
              {cms.short_description ?? 'Genuine parts from VIPURI branches across Tanzania.'}
            </p>
          </div>
        </div>
      </div>

      <div className="account-content">
        <div className="account-content__header">
          <Link href="/" className="account-logo">
            <img src={settings?.site.logo ?? '/assets/images/logo_icon/logo.svg'} alt="VIPURI" />
          </Link>
          {footer}
        </div>

        <div className="account-content__body">
          <div className="account-card">
            <div className="account-card__header">
              <div className="account-card__headings">
                <h3 className="account-card__title">{heading}</h3>
                <p className="account-card__desc">{description ?? cms.subtitle}</p>
              </div>
              <SocialAuth />
            </div>
            <div className="account-card__body">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
