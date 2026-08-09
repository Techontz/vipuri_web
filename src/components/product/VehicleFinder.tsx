'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';

type VehicleOptions = {
  years: (string | number)[];
  models: string[];
  engines: string[];
  engine_types: string[];
  brands: { id: number; name: string; slug: string }[];
};

const EMPTY: VehicleOptions = { years: [], models: [], engines: [], engine_types: [], brands: [] };

/**
 * The "find the part for your vehicle" search bar from the theme's
 * `sections/search.blade.php`. Selecting year / brand / model / engine /
 * engine type filters the product listing, exactly as in the original.
 */
export function VehicleFinder({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [options, setOptions] = useState<VehicleOptions>(EMPTY);
  const [form, setForm] = useState({
    vehicle_year: '',
    brand_select: '',
    vehicle_model: '',
    vehicle_engine: '',
    vehicle_engine_type: '',
  });

  useEffect(() => {
    let cancelled = false;

    api<VehicleOptions>('/products/vehicle-filters', { cache: 'force-cache' })
      .then((data) => {
        if (!cancelled) setOptions({ ...EMPTY, ...data });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    Object.entries(form).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    router.push(`/products${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <section className={`search ${compact ? 'mb-40' : 'my-60'}`}>
      <div className="container">
        <form className="search-form" onSubmit={submit}>
          <div className="search-form__field">
            <select className="form-select form--select" name="vehicle_year" value={form.vehicle_year} onChange={update('vehicle_year')}>
              <option value="">Select Year</option>
              {options.years.map((year) => (
                <option value={String(year)} key={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="search-form__field">
            <select className="form-select form--select" name="brand_select" value={form.brand_select} onChange={update('brand_select')}>
              <option value="">Select Brand</option>
              {options.brands.map((brand) => (
                <option value={String(brand.id)} key={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
          <div className="search-form__field">
            <select className="form-select form--select" name="vehicle_model" value={form.vehicle_model} onChange={update('vehicle_model')}>
              <option value="">Car Model</option>
              {options.models.map((model) => (
                <option value={model} key={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
          <div className="search-form__field">
            <select className="form-select form--select" name="vehicle_engine" value={form.vehicle_engine} onChange={update('vehicle_engine')}>
              <option value="">Select Engine</option>
              {options.engines.map((engine) => (
                <option value={engine} key={engine}>
                  {engine}
                </option>
              ))}
            </select>
          </div>
          <div className="search-form__field">
            <select
              className="form-select form--select"
              name="vehicle_engine_type"
              value={form.vehicle_engine_type}
              onChange={update('vehicle_engine_type')}
            >
              <option value="">Engine Type</option>
              {options.engine_types.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="search-form__field">
            <button className="w-100 btn btn--base" type="submit">
              Find Now
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
