'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { api } from '@/lib/api';
import { imageUrl } from '@/lib/format';
import { useMounted } from '@/lib/useMounted';

type Brand = {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
};

type PageSections = {
  sections?: { 'brand.content'?: { page_tag?: string; page_title?: string } };
};

/**
 * Every brand, mirroring `templates/basic/brands.blade.php`: the heading text
 * comes from the `brand.content` CMS block, then a six-across grid of logos.
 *
 * A tile leads to the shop filtered by that brand, which is where the
 * original's `brands/{slug}` route landed.
 */
export function AllBrands() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [heading, setHeading] = useState<{ tag: string; title: string }>({ tag: '', title: '' });
  const mounted = useMounted();

  useEffect(() => {
    api<{ brands: Brand[] }>('/brands', { cache: 'force-cache' })
      .then((data) => {
        if (mounted()) setBrands(data.brands ?? []);
      })
      .catch(() => {
        if (mounted()) setBrands([]);
      });

    api<PageSections>('/pages/brands', { cache: 'force-cache' })
      .then((data) => {
        const content = data.sections?.['brand.content'];

        if (mounted() && content) {
          setHeading({ tag: content.page_tag ?? '', title: content.page_title ?? '' });
        }
      })
      .catch(() => {
        // The grid is the page; a missing CMS block just leaves the heading blank.
      });
  }, [mounted]);

  return (
    <>
      <Breadcrumb title="Brands" />

      <section className="brand style-two my-120">
        <div className="container">
          <div className="section-heading">
            <span className="section-heading__tagline">{heading.tag}</span>
            <h2 className="section-heading__title">{heading.title}</h2>
          </div>
          <div className="row gy-4">
            {brands === null &&
              Array.from({ length: 12 }).map((_, index) => (
                <div className="col-xl-2 col-md-3 col-4" key={index}>
                  <div className="vp-skeleton" style={{ height: 120 }} />
                </div>
              ))}

            {brands?.map((brand) => (
              <div className="col-xl-2 col-md-3 col-4" key={brand.id}>
                <Link className="brand-item" href={`/products?brand_slug=${brand.slug}`}>
                  <div className="brand-item__logo">
                    <img src={imageUrl(brand.logo)} alt="brand image" />
                  </div>
                  <span className="brand-item__name">{brand.name}</span>
                </Link>
              </div>
            ))}
          </div>

          {brands?.length === 0 && <p className="text-center mb-0">No brands have been published yet.</p>}
        </div>
      </section>
    </>
  );
}
