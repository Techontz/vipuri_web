'use client';

import { useSettings } from '@/components/providers/AppProviders';
import { backendUrl } from '@/lib/api';

/**
 * Sign-in-with buttons, mirroring `partials/social_login.blade.php`.
 *
 * The list comes from the API — only providers an administrator has both
 * configured and enabled appear. These are real navigations to the backend,
 * which builds the provider redirect, so no client secret is ever exposed.
 */

const LOGOS: Record<string, { label: string; image: string }> = {
  google: { label: 'Google', image: '/assets/templates/basic/images/thumbs/google-logo.png' },
  facebook: { label: 'Facebook', image: '/assets/templates/basic/images/thumbs/facebook.png' },
  linkedin: { label: 'LinkedIn', image: '/assets/templates/basic/images/thumbs/google-logo.png' },
};

export function SocialAuth() {
  const settings = useSettings();
  const providers = (settings?.social_logins ?? []).filter((provider) => provider in LOGOS);

  if (providers.length === 0) {
    return null;
  }

  return (
    <>
      <div className="social-auth mb-3">
        {providers.map((provider) => (
          <a className="social-auth__btn" href={`${backendUrl()}/social-login/${provider}`} key={provider}>
            <img src={LOGOS[provider].image} alt={provider} />
            <span className="text">{LOGOS[provider].label}</span>
          </a>
        ))}
      </div>

      <div className="account-divider">
        <span>Or</span>
      </div>
    </>
  );
}
