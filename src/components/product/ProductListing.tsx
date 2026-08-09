'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EmptyMessage } from '@/components/ui/EmptyMessage';
import { Pagination } from '@/components/ui/Pagination';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductFilter, type FilterState } from '@/components/product/ProductFilter';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { api, query } from '@/lib/api';
import type { Pagination as PaginationMeta, ProductCard as ProductCardType } from '@/types';

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Sort By (Default)' },
  { value: 'best_seller', label: 'Most popular' },
  { value: 'new_release', label: 'New' },
  { value: 'top_rated', label: 'Top Rated' },
  { value: 'low_to_high', label: 'Price Low to High' },
  { value: 'high_to_low', label: 'Price High to Low' },
  { value: 'discount_low_to_high', label: 'Discount Low to High' },
  { value: 'discount_high_to_low', label: 'Discount High to Low' },
];

/**
 * Product listing. Mirrors `templates/basic/products.blade.php`: filter
 * sidebar on the left, toolbar with search + sort, product grid and
 * pagination. Filtering updates the URL so results stay shareable, exactly
 * like the original (which used AJAX plus query parameters).
 */
export function ProductListing() {
  const router = useRouter();
  const params = useSearchParams();

  const [products, setProducts] = useState<ProductCardType[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [category, setCategory] = useState<{ name: string; description: string | null } | null>(null);
  const [brand, setBrand] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(params.get('search') ?? '');

  const filters = useMemo<FilterState>(
    () => ({
      category: params.getAll('category[]').length ? params.getAll('category[]') : params.getAll('category'),
      brand: params.getAll('brand[]'),
      rating: params.get('rating') ?? '',
      min_price: params.get('min_price') ?? '',
      max_price: params.get('max_price') ?? '',
      vehicle_year: params.get('vehicle_year') ?? '',
      brand_select: params.get('brand_select') ?? '',
      vehicle_model: params.get('vehicle_model') ?? '',
      vehicle_engine: params.get('vehicle_engine') ?? '',
      vehicle_engine_type: params.get('vehicle_engine_type') ?? '',
      in_stock: params.get('in_stock') === '1',
      branch_id: params.get('branch_id') ?? '',
    }),
    [params],
  );

  const sortBy = params.get('sort_by') ?? '';
  const page = Number(params.get('page') ?? 1);
  const brandSlug = params.get('brand_slug') ?? '';

  useEffect(() => {
    setSearch(params.get('search') ?? '');
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const requestQuery = query({
      search: params.get('search') ?? '',
      sort_by: sortBy,
      page: page > 1 ? page : '',
      brand_slug: brandSlug,
      campaign: params.get('campaign') ?? '',
      deals: params.get('deals') ?? '',
      featured: params.get('featured') ?? '',
      offer: params.getAll('offer[]'),
      rating: filters.rating,
      min_price: filters.min_price,
      max_price: filters.max_price,
      vehicle_year: filters.vehicle_year,
      brand_select: filters.brand_select,
      vehicle_model: filters.vehicle_model,
      vehicle_engine: filters.vehicle_engine,
      vehicle_engine_type: filters.vehicle_engine_type,
      in_stock: filters.in_stock ? '1' : '',
      branch_id: filters.branch_id,
      brand: filters.brand,
      // The API accepts a single category slug; multi-select sends the first
      // and relies on descendant expansion, matching the source behaviour.
      category: filters.category[0] ?? params.get('category') ?? '',
    });

    api<{
      products: ProductCardType[];
      pagination: PaginationMeta;
      filters: { min_price: number; max_price: number };
      category: { name: string; description: string | null } | null;
      brand: { name: string } | null;
    }>(`/products${requestQuery}`)
      .then((data) => {
        if (cancelled) return;
        setProducts(data.products ?? []);
        setPagination(data.pagination ?? null);
        setPriceRange({ min: data.filters?.min_price ?? 0, max: data.filters?.max_price ?? 1000 });
        setCategory(data.category);
        setBrand(data.brand);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params, sortBy, page, brandSlug, filters]);

  /** Push filter changes into the URL so results are shareable. */
  const pushParams = useCallback(
    (updates: Record<string, string | string[] | boolean | undefined>, resetPage = true) => {
      const next = new URLSearchParams(params.toString());

      Object.entries(updates).forEach(([key, value]) => {
        next.delete(key);
        next.delete(`${key}[]`);

        if (value === undefined || value === '' || value === false) return;

        if (Array.isArray(value)) {
          value.forEach((item) => next.append(`${key}[]`, item));
          return;
        }

        next.set(key, value === true ? '1' : value);
      });

      if (resetPage) next.delete('page');

      router.push(`/products${next.toString() ? `?${next.toString()}` : ''}`, { scroll: false });
    },
    [params, router],
  );

  const heading = brand?.name ?? category?.name ?? null;

  // `ProductController::products` titles the banner after whatever the listing
  // is filtered by, falling back to plain "Products".
  const bannerTitle = heading ? `${heading} - Products` : 'Products';

  return (
    <>
      <Breadcrumb title={bannerTitle} />

      <section className="my-120">
        <div className="container">
          <div className="row">
            <div className="col-xl-3">
              <div className="offcanvas-xl offcanvas-start filter--offcanvas" tabIndex={-1} id="filterOffcanvas">
                <div className="offcanvas-header">
                  <h5 className="mb-0">Filter Products</h5>
                  <button
                    className="btn btn--sm btn--close btn-soft--dark"
                    type="button"
                    data-bs-target="#filterOffcanvas"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                  />
                </div>
                <div className="offcanvas-body">
                  <ProductFilter
                    value={filters}
                    priceRange={priceRange}
                    onChange={(next) =>
                      pushParams({
                        category: next.category ?? filters.category,
                        brand: next.brand ?? filters.brand,
                        rating: next.rating ?? filters.rating,
                        min_price: next.min_price ?? filters.min_price,
                        max_price: next.max_price ?? filters.max_price,
                        vehicle_year: next.vehicle_year ?? filters.vehicle_year,
                        brand_select: next.brand_select ?? filters.brand_select,
                        vehicle_model: next.vehicle_model ?? filters.vehicle_model,
                        vehicle_engine: next.vehicle_engine ?? filters.vehicle_engine,
                        vehicle_engine_type: next.vehicle_engine_type ?? filters.vehicle_engine_type,
                        in_stock: next.in_stock ?? filters.in_stock,
                        branch_id: next.branch_id ?? filters.branch_id,
                      })
                    }
                    onClear={() => router.push('/products')}
                  />
                </div>
              </div>
            </div>

            <div className="col-xl-9">
              <div className="page-content">
                {heading && (
                  <div className="mb-4">
                    <h2 className="section-heading__title">{heading}</h2>
                    {category?.description && <p className="mt-2">{category.description}</p>}
                  </div>
                )}

                <div className="page-content__header">
                  <div className="toolbar">
                    <div className="toolbar__left">
                      <form
                        className="toolbar-search"
                        onSubmit={(event) => {
                          event.preventDefault();
                          pushParams({ search: search.trim() });
                        }}
                      >
                        <div className="input-group input--group">
                          <button className="input-group-text" type="submit" aria-label="Search">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-search-icon lucide-search"
                            >
                              <path d="m21 21-4.34-4.34" />
                              <circle cx="11" cy="11" r="8" />
                            </svg>
                          </button>
                          <input
                            className="form-control form--control"
                            type="search"
                            name="search"
                            value={search}
                            placeholder="Search..."
                            onChange={(event) => setSearch(event.target.value)}
                          />
                        </div>
                      </form>
                    </div>
                    <div className="toolbar__right">
                      <select
                        className="form-control form--control wide"
                        name="sort_by"
                        value={sortBy}
                        onChange={(event) => pushParams({ sort_by: event.target.value })}
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option value={option.value} key={option.value || 'default'}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn--icon btn--base d-xl-none"
                        type="button"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#filterOffcanvas"
                        aria-controls="filterOffcanvas"
                        aria-label="Filters"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-funnel-icon lucide-funnel"
                        >
                          <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="page-content__body productsData">
                  {loading ? (
                    <div className="row gy-4">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div className="col-xsm-6 col-sm-6 col-lg-4 col-xxl-3" key={index}>
                          <div className="vp-skeleton vp-skeleton--card" />
                        </div>
                      ))}
                    </div>
                  ) : products.length === 0 ? (
                    <EmptyMessage message="No product found" />
                  ) : (
                    <div className="row gy-4">
                      {products.map((product) => (
                        <div className="col-xsm-6 col-sm-6 col-lg-4 col-xxl-3" key={product.id}>
                          <ProductCard product={product} showcase="popular" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {pagination && pagination.last_page > 1 && (
                  <div className="page-content__footer productsPagination">
                    <Pagination
                      pagination={pagination}
                      onChange={(nextPage) => {
                        pushParams({ page: nextPage > 1 ? String(nextPage) : '' }, false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
