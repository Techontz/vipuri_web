'use client';

import Link from 'next/link';

import { useSettings } from '@/components/providers/AppProviders';

/**
 * Page banner + breadcrumb, matching `sections/page_banner.blade.php`.
 *
 * The original renders exactly two crumbs — Home and the page title — so this
 * takes no trail. The banner image comes from the `page_banner.content` CMS
 * section and is passed through `data-background-image`, which the theme's own
 * `.bg-img` handler in main.js turns into the background.
 */
export function Breadcrumb({ title }: { title: string }) {
  const settings = useSettings();
  const image = settings?.page_banner?.image ?? null;

  return (
    <section
      className="page-banner bg-img"
      data-background-image={image ?? undefined}
      style={image ? { backgroundImage: `url(${image})` } : undefined}
    >
      <div className="container">
        <h3 className="page-banner__title">{title}</h3>
        <ul className="breadcrumb custom--breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/">
              <i className="las la-home" />
              Home
            </Link>
          </li>
          <li className="breadcrumb-item" aria-current="page">
            {title}
          </li>
        </ul>
      </div>
    </section>
  );
}
