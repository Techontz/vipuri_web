'use client';

import { useEffect, useState } from 'react';

import { useTranslate } from '@/components/providers/LanguageProvider';
import { Rating } from '@/components/product/Rating';
import { api } from '@/lib/api';
import { showAmount } from '@/lib/format';
import type { BrandSummary, CategoryNode } from '@/types';

export type FilterState = {
  category: string[];
  brand: string[];
  rating: string;
  min_price: string;
  max_price: string;
  vehicle_year: string;
  brand_select: string;
  vehicle_model: string;
  vehicle_engine: string;
  vehicle_engine_type: string;
  in_stock: boolean;
  branch_id: string;
};

type VehicleOptions = {
  years: (string | number)[];
  models: string[];
  engines: string[];
  engine_types: string[];
  brands: { id: number; name: string; slug: string }[];
};

/**
 * Product filter sidebar, mirroring `components/product/filter.blade.php`:
 * vehicle finder, category tree, brands, price range and rating.
 */
export function ProductFilter({
  value,
  onChange,
  onClear,
  priceRange,
}: {
  value: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onClear: () => void;
  priceRange: { min: number; max: number };
}) {
  const t = useTranslate();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [vehicle, setVehicle] = useState<VehicleOptions>({
    years: [],
    models: [],
    engines: [],
    engine_types: [],
    brands: [],
  });
  const [branches, setBranches] = useState<{ id: number; name: string; city: string | null }[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api<{ categories: CategoryNode[] }>('/categories?parents_only=1', { cache: 'force-cache' }),
      api<{ brands: BrandSummary[] }>('/brands', { cache: 'force-cache' }),
      api<VehicleOptions>('/products/vehicle-filters', { cache: 'force-cache' }),
      api<{ branches: { id: number; name: string; city: string | null }[] }>('/branches', { cache: 'force-cache' }),
    ])
      .then(([cats, brandData, vehicleData, branchData]) => {
        if (cancelled) return;
        setCategories(cats.categories ?? []);
        setBrands(brandData.brands ?? []);
        setVehicle({ ...vehicle, ...vehicleData });
        setBranches(branchData.branches ?? []);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleArray = (key: 'category' | 'brand', item: string) => {
    const current = value[key];
    const next = current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item];
    onChange({ [key]: next } as Partial<FilterState>);
  };

  return (
    <form className="filter-form" onSubmit={(event) => event.preventDefault()}>
      <div className="filter-form__body">
        {/* -------------------------- Vehicle -------------------------- */}
        <div className="filter-form-block">
          <div className="filter-form-block__header">
            <span className="filter-form-block__label">Select Vehicle</span>
          </div>
          <div className="filter-form-block__body">
            <div className="form-group">
              <select
                className="form-select form--select vehicle-filter"
                name="vehicle_year"
                value={value.vehicle_year}
                onChange={(event) => onChange({ vehicle_year: event.target.value })}
              >
                <option value="">Select Year</option>
                {vehicle.years.map((year) => (
                  <option value={String(year)} key={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <select
                className="form-select form--select vehicle-filter"
                name="brand_select"
                value={value.brand_select}
                onChange={(event) => onChange({ brand_select: event.target.value })}
              >
                <option value="">Select Brand</option>
                {vehicle.brands.map((brand) => (
                  <option value={String(brand.id)} key={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <select
                className="form-select form--select vehicle-filter"
                name="vehicle_model"
                value={value.vehicle_model}
                onChange={(event) => onChange({ vehicle_model: event.target.value })}
              >
                <option value="">Car Model</option>
                {vehicle.models.map((model) => (
                  <option value={model} key={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <select
                className="form-select form--select vehicle-filter"
                name="vehicle_engine"
                value={value.vehicle_engine}
                onChange={(event) => onChange({ vehicle_engine: event.target.value })}
              >
                <option value="">Select Engine</option>
                {vehicle.engines.map((engine) => (
                  <option value={engine} key={engine}>
                    {engine}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group mb-0">
              <select
                className="form-select form--select vehicle-filter"
                name="vehicle_engine_type"
                value={value.vehicle_engine_type}
                onChange={(event) => onChange({ vehicle_engine_type: event.target.value })}
              >
                <option value="">Engine Type</option>
                {vehicle.engine_types.map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ------------------------- Categories ------------------------ */}
        {categories.length > 0 && (
          <div className="filter-form-block">
            <div className="filter-form-block__header">
              <span className="filter-form-block__label">{t('Categories')}</span>
            </div>
            <div className="filter-form-block__body scrollable">
              <ul className="filter-form-list">
                {categories.map((category, index) => (
                  <li className="filter-form-list__item" key={category.id}>
                    <div className="form-check form--check form--check-cat">
                      <input
                        className="form-check-input category-check"
                        type="checkbox"
                        id={`cat-${category.id}`}
                        checked={value.category.includes(category.slug)}
                        onChange={() => toggleArray('category', category.slug)}
                      />
                      <label
                        className="form-check-label"
                        data-bs-toggle="collapse"
                        data-bs-target={`#filter-cat-collapse-${index + 1}`}
                      >
                        {category.name}
                      </label>
                    </div>

                    {category.subcategories.length > 0 && (
                      <div className="collapse" id={`filter-cat-collapse-${index + 1}`}>
                        <ul className="filter-form-list">
                          {category.subcategories.map((sub) => (
                            <li className="filter-form-list__item" key={sub.id}>
                              <div className="form-check form--check">
                                <input
                                  type="checkbox"
                                  className="form-check-input category-check"
                                  id={`cat-${sub.id}`}
                                  checked={value.category.includes(sub.slug)}
                                  onChange={() => toggleArray('category', sub.slug)}
                                />
                                <label className="form-check-label" htmlFor={`cat-${sub.id}`}>
                                  {sub.name}
                                </label>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* --------------------------- Brands -------------------------- */}
        {brands.length > 0 && (
          <div className="filter-form-block">
            <div className="filter-form-block__header">
              <span className="filter-form-block__label">Filter By Brands</span>
            </div>
            <div className="filter-form-block__body scrollable">
              <ul className="filter-form-list">
                {brands.map((brand) => (
                  <li className="filter-form-list__item" key={brand.id}>
                    <div className="form-check form--check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`b-${brand.id}`}
                        checked={value.brand.includes(String(brand.id))}
                        onChange={() => toggleArray('brand', String(brand.id))}
                      />
                      <label className="form-check-label" htmlFor={`b-${brand.id}`}>
                        {brand.name}
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ---------------------------- Price -------------------------- */}
        <div className="filter-form-block">
          <div className="filter-form-block__header">
            <span className="filter-form-block__label">Filter by Price</span>
          </div>
          <div className="filter-form-block__body">
            <div className="filter-form-range mb-3">
              <input
                className="filter-form-range__input"
                type="number"
                step="any"
                min={0}
                name="min_price"
                value={value.min_price}
                placeholder={String(Math.floor(priceRange.min))}
                onChange={(event) => onChange({ min_price: event.target.value })}
              />
              <input
                className="filter-form-range__input"
                type="number"
                step="any"
                min={0}
                name="max_price"
                value={value.max_price}
                placeholder={String(Math.ceil(priceRange.max))}
                onChange={(event) => onChange({ max_price: event.target.value })}
              />
            </div>
            <p className="mb-0 text-muted" style={{ fontSize: 13 }}>
              {showAmount(priceRange.min)} &ndash; {showAmount(priceRange.max)}
            </p>
          </div>
        </div>

        {/* -------------------------- Availability --------------------- */}
        <div className="filter-form-block">
          <div className="filter-form-block__header">
            <span className="filter-form-block__label">Availability</span>
          </div>
          <div className="filter-form-block__body">
            <div className="form-check form--check">
              <input
                className="form-check-input"
                type="checkbox"
                id="in-stock"
                checked={value.in_stock}
                onChange={(event) => onChange({ in_stock: event.target.checked })}
              />
              <label className="form-check-label" htmlFor="in-stock">
                In stock only
              </label>
            </div>
            {branches.length > 0 && (
              <div className="form-group mt-3 mb-0">
                <select
                  className="form-select form--select"
                  value={value.branch_id}
                  onChange={(event) => onChange({ branch_id: event.target.value })}
                >
                  <option value="">Available at any branch</option>
                  {branches.map((branch) => (
                    <option value={String(branch.id)} key={branch.id}>
                      {branch.name}
                      {branch.city ? ` — ${branch.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* --------------------------- Rating -------------------------- */}
        <div className="filter-form-block">
          <div className="filter-form-block__header">
            <span className="filter-form-block__label">Filter by Rating</span>
          </div>
          <div className="filter-form-block__body">
            <ul className="filter-form-list">
              {[5, 4, 3, 2, 1].map((star) => (
                <li className="filter-form-list__item" key={star}>
                  <div className="form-check form--check">
                    <input
                      className="form-check-input rating"
                      name="rating"
                      value={star}
                      type="radio"
                      id={`star-${star}`}
                      checked={value.rating === String(star)}
                      onChange={() => onChange({ rating: String(star) })}
                    />
                    <label className="form-check-label" htmlFor={`star-${star}`}>
                      <Rating average={star} showCount={false} />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="filter-form__footer">
        <button className="w-100 btn btn-outline--base btn--sm mt-3 clearRating" type="button" onClick={onClear}>
          <i className="las la-times" /> Clear
        </button>
      </div>
    </form>
  );
}
