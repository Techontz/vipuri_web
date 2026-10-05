'use client';

import { useSettings } from '@/components/providers/AppProviders';
import { useLanguage } from '@/components/providers/LanguageProvider';

/**
 * Language switcher, mirroring `partials/dropdown-lang.blade.php`.
 *
 * The original posted to `/change/{lang}` and re-rendered server-side. Here the
 * choice is applied in the browser and remembered, so the page does not reload.
 * Renders nothing while only one language is configured, as the original's
 * single-language install effectively did.
 */
export function LanguageDropdown() {
  const settings = useSettings();
  const { code, choose } = useLanguage();

  const languages = settings?.languages ?? [];

  if (languages.length < 2) return null;

  const current = languages.find((language) => language.code === code) ?? languages[0];

  return (
    <div className="dropdown dropdown--lang">
      <button className="dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <span className="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
            viewBox="0 0 16 16"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            role="img"
          >
            <path
              d="M1.5 8H14.5"
              stroke="currentColor"
              strokeWidth="1.21"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5Z"
              stroke="currentColor"
              strokeWidth="1.21"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10.7083 8C10.7083 12.3333 7.99996 14.5 7.99996 14.5C7.99996 14.5 5.29163 12.3333 5.29163 8C5.29163 3.66667 7.99996 1.5 7.99996 1.5C7.99996 1.5 10.7083 3.66667 10.7083 8Z"
              stroke="currentColor"
              strokeWidth="1.21"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text">{current.name}</span>
      </button>
      <div className="dropdown-menu dropdown-menu-end">
        {languages.map((language) => (
          <button
            className={`dropdown-item langChange ${language.code === current.code ? 'active' : ''}`}
            type="button"
            key={language.code}
            onClick={() => choose(language.code)}
          >
            <span className="lang-text">{language.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
