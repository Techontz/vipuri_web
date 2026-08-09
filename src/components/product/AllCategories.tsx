'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { api } from '@/lib/api';
import { imageUrl } from '@/lib/format';
import { useMounted } from '@/lib/useMounted';
import type { CategoryNode } from '@/types';

/**
 * The full category tree, mirroring `templates/basic/all_category.blade.php`:
 * one card per top-level category, each with a slider of its subcategories.
 *
 * The slider is the theme's own `all-cat-block-slider`, initialised by main.js.
 */
export function AllCategories() {
  const [categories, setCategories] = useState<CategoryNode[] | null>(null);
  const mounted = useMounted();

  useEffect(() => {
    api<{ categories: CategoryNode[] }>('/categories', { cache: 'force-cache' })
      .then((data) => {
        if (mounted()) setCategories(data.categories ?? []);
      })
      .catch(() => {
        if (mounted()) setCategories([]);
      });
  }, [mounted]);

  // Re-run the theme's slider setup once the cards exist.
  useEffect(() => {
    if (!categories?.length) return;

    const timer = window.setTimeout(() => window.VipuriTheme?.init?.(), 50);

    return () => window.clearTimeout(timer);
  }, [categories]);

  return (
    <>
      <Breadcrumb title="All Categories" />

      <section className="all-cat my-120">
        <div className="container">
          {categories === null && <div className="vp-skeleton" style={{ height: 320 }} />}

          {categories?.map((category) => (
            <div className="all-cat-card" key={category.id}>
              <div className="all-cat-card__header">
                <div className="all-cat-card-info">
                  <img
                    className="all-cat-card-info__thumb"
                    src={imageUrl(category.image ?? category.icon)}
                    alt={category.name}
                  />
                  <div className="all-cat-card-info__content">
                    <h2 className="all-cat-card-info__title">{category.name}</h2>
                    <p className="all-cat-card-info__desc">{category.description ?? ''}</p>
                  </div>
                </div>
              </div>
              <div className="all-cat-card__body">
                <div className="all-cat-block">
                  <div className="all-cat-block__body">
                    <div className="all-cat-block-slider">
                      {category.subcategories.map((subcategory) => (
                        <div className="all-cat-block-slider__slide" key={subcategory.id}>
                          <Link className="cat-card" href={`/products?category=${subcategory.slug}`}>
                            <img
                              className="cat-card__thumb"
                              src={imageUrl(subcategory.image ?? subcategory.icon)}
                              alt={subcategory.name}
                            />
                            <span className="cat-card__name">{subcategory.name}</span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {categories?.length === 0 && <p className="text-center mb-0">No categories have been published yet.</p>}
        </div>
      </section>
    </>
  );
}
