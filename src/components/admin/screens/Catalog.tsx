'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminProviders';
import { Card, DataTable, Field, StatusBadge, StockPill } from '@/components/admin/ui';
import { ApiError, api, apiWithMessage, uploadWithProgress } from '@/lib/api';
import { imageUrl, showAmount } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Pagination as PaginationMeta } from '@/types';
import { GalleryPicker, type ExistingImage } from '@/components/admin/ImagePicker';

/* ================================= Products =============================== */

type ProductRow = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  image: string | null;
  product_type: string;
  brand: string | null;
  categories: string[];
  regular_price: number;
  sale_price: number;
  price: number;
  stock_quantity: number;
  track_inventory: boolean;
  unit: string | null;
  variations_count: number;
  is_featured: boolean;
  status: boolean;
  total_sold: number | null;
};

export function ProductsScreen() {
  const { can } = useAdmin();

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', type: '', status: '', low_stock: false });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const query = new URLSearchParams({ page: String(page) });
      if (filters.search) query.set('search', filters.search);
      if (filters.type) query.set('type', filters.type);
      if (filters.status) query.set('status', filters.status);
      if (filters.low_stock) query.set('low_stock', '1');

      const data = await api<{ products: ProductRow[]; pagination: PaginationMeta }>(
        `/admin/products?${query.toString()}`,
        { auth: 'admin' },
      );

      setRows(data.products ?? []);
      setPagination(data.pagination ?? null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load products');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminPageHeader title="Products">
        {can('product.create') && (
          <Link href="/admin/products/create" className="btn btn--primary btn--sm">
            <i className="las la-plus" /> Add product
          </Link>
        )}
      </AdminPageHeader>

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              className="form-control"
              placeholder="Name or SKU"
              value={filters.search}
              onChange={(event) => {
                setFilters((current) => ({ ...current, search: event.target.value }));
                setPage(1);
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={filters.type}
              onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
            >
              <option value="">All types</option>
              <option value="simple">Simple</option>
              <option value="variable">Variable</option>
              <option value="grouped">Grouped</option>
              <option value="external">External</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="">All</option>
              <option value="1">Published</option>
              <option value="0">Unpublished</option>
            </select>
          </div>
          <div className="form-group">
            <div className="form-check mt-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="low-stock"
                checked={filters.low_stock}
                onChange={(event) => setFilters((current) => ({ ...current, low_stock: event.target.checked }))}
              />
              <label className="form-check-label" htmlFor="low-stock">
                Low stock only
              </label>
            </div>
          </div>
        </div>

        <DataTable
          rows={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          empty="No products yet"
          columns={[
            {
              key: 'product',
              label: 'Product',
              render: (row) => (
                <div className="d-flex align-items-center gap-3">
                  <img src={imageUrl(row.image)} alt={row.name} width={44} height={44} style={{ borderRadius: 6, objectFit: 'cover' }} />
                  <div>
                    <Link href={`/admin/products/${row.id}`}>
                      <strong>{row.name}</strong>
                    </Link>
                    <span className="d-block" style={{ fontSize: 13 }}>
                      {row.sku ?? '—'} · {row.brand ?? 'No brand'}
                    </span>
                  </div>
                </div>
              ),
            },
            { key: 'type', label: 'Type', render: (row) => <span className="badge badge--primary text-capitalize">{row.product_type}</span> },
            {
              key: 'price',
              label: 'Price',
              align: 'end',
              render: (row) => (
                <>
                  <strong>{showAmount(row.price)}</strong>
                  {row.sale_price > 0 && row.sale_price < row.regular_price && (
                    <span className="d-block" style={{ fontSize: 13, textDecoration: 'line-through' }}>
                      {showAmount(row.regular_price)}
                    </span>
                  )}
                </>
              ),
            },
            {
              key: 'stock',
              label: 'Stock',
              align: 'end',
              render: (row) =>
                row.track_inventory ? <StockPill quantity={row.stock_quantity} minimum={5} /> : <span>Untracked</span>,
            },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge active={row.status} labels={['Published', 'Draft']} /> },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (row) => (
                <div className="d-flex gap-2 justify-content-end">
                  {can('product.update') && (
                    <Link href={`/admin/products/${row.id}`} className="btn btn--sm btn-outline--primary">
                      Edit
                    </Link>
                  )}
                  {can('product.status') && (
                    <button
                      className={`btn btn--sm ${row.status ? 'btn-outline--warning' : 'btn-outline--success'}`}
                      type="button"
                      onClick={async () => {
                        try {
                          const { message } = await apiWithMessage(`/admin/products/${row.id}/status`, {
                            method: 'POST',
                            auth: 'admin',
                          });
                          toastSuccess(message);
                          await load();
                        } catch (error) {
                          toastError(error instanceof ApiError ? error.message : 'Could not change the status');
                        }
                      }}
                    >
                      {row.status ? 'Unpublish' : 'Publish'}
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}

/* ------------------------------ Product form ------------------------------ */

type FormData = {
  categories: { id: number; name: string; parent_id: number | null }[];
  brands: { id: number; name: string }[];
  taxes: { id: number; name: string; rate: number }[];
  stock_units: { id: number; name: string }[];
  shipping_classes: { id: number; name: string }[];
  attributes: { id: number; name: string; control_type: string | null; values: { id: number; name: string }[] }[];
  branches: { id: number; name: string; code: string }[];
  product_types: { value: string; label: string }[];
  low_stock_activities: { value: number; label: string }[];
};

const EMPTY_PRODUCT = {
  name: '',
  product_type: 'simple',
  brand_id: '',
  category_ids: [] as number[],
  short_description: '',
  description: '',
  specifications: [] as { key: string; value: string }[],
  regular_price: '',
  sale_price: '',
  tax_class: '',
  tax_status: 'taxable',
  show_tax: true,
  sku: '',
  gtin: '',
  inventory_type: 1,
  stock_quantity: '0',
  stock_unit_id: '',
  display_available: true,
  display_stock_quantity: true,
  min_stock_quantity: '0',
  low_stock_activity: 0,
  threshold_quantity: '0',
  min_cart_quantity: '1',
  max_cart_quantity: '20',
  allow_backorder: false,
  weight: '0',
  length: '0',
  width: '0',
  height: '0',
  shipping_class: '',
  product_url: '',
  button_text: '',
  is_featured: false,
  status: true,
  show_deals: false,
  limited_stock: false,
  vehicle_year: '',
  vehicle_model: '',
  vehicle_engine: '',
  vehicle_engine_type: '',
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
  attribute_ids: [] as number[],
  variations: [] as {
    id?: number;
    attribute_values: number[];
    regular_price: string;
    sale_price: string;
    sku: string;
    stock_quantity: string;
  }[],
  grouped_ids: [] as number[],
  up_sell_ids: [] as number[],
  cross_sell_ids: [] as number[],
  branch_stock: [] as { branch_id: number; variation_id: number; stock_quantity: string; min_stock_quantity: string; shelf_location: string }[],
};

export function ProductFormScreen({ productId }: { productId?: number }) {
  const router = useRouter();
  const { can } = useAdmin();

  const [meta, setMeta] = useState<FormData | null>(null);
  const [form, setForm] = useState({ ...EMPTY_PRODUCT });
  const [images, setImages] = useState<File[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState<number | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<FormData>('/admin/products/form-data', { auth: 'admin' })
      .then(setMeta)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    api<{
      product: Record<string, unknown>;
      raw: { tax_class: number; stock_unit_id: number; category_ids: number[]; attribute_ids: number[]; grouped_ids: number[]; up_sell_ids: number[]; cross_sell_ids: number[] };
      branch_inventory: { branch_id: number; variation_id: number; stock_quantity: number; min_stock_quantity: number; shelf_location: string | null }[];
    }>(`/admin/products/${productId}`, { auth: 'admin' })
      .then((data) => {
        const product = data.product as never as {
          name: string;
          product_type: string;
          brand: { id: number } | null;
          short_description: string | null;
          description: string | null;
          specifications: { key: string; value: string }[];
          regular_price: number;
          sale_price: number;
          tax: { rate: number; status: string; show: boolean } | null;
          sku: string | null;
          gtin: string | null;
          inventory: Record<string, number | boolean | string | null>;
          min_cart_quantity: number;
          max_cart_quantity: number;
          shipping: Record<string, number | string | null>;
          vehicle: Record<string, string | number | null>;
          product_url: string | null;
          button_text: string | null;
          is_featured?: boolean;
          gallery: { id: number; url: string | null; is_main?: boolean }[];
          variations: { id: number; attribute_values: number[]; regular_price: number; sale_price: number; sku: string | null; stock_quantity: number }[];
          meta: { title: string | null; description: string | null; keywords: string | null };
        };

        setForm((current) => ({
          ...current,
          name: product.name,
          product_type: product.product_type,
          brand_id: product.brand ? String(product.brand.id) : '',
          category_ids: data.raw.category_ids ?? [],
          short_description: product.short_description ?? '',
          description: product.description ?? '',
          specifications: product.specifications ?? [],
          regular_price: String(product.regular_price ?? ''),
          sale_price: String(product.sale_price ?? ''),
          // Populated from `raw`, not from `product.tax`, which carries the
          // tax's name and rate but not its id. Leaving these unset left the
          // selects empty, and an untouched select posts "" — which reached
          // the database as null and broke the update.
          tax_class: data.raw.tax_class ? String(data.raw.tax_class) : '',
          stock_unit_id: data.raw.stock_unit_id ? String(data.raw.stock_unit_id) : '',
          tax_status: product.tax?.status ?? 'taxable',
          show_tax: product.tax?.show ?? true,
          sku: product.sku ?? '',
          gtin: product.gtin ?? '',
          inventory_type: product.inventory.track_inventory ? 1 : 0,
          stock_quantity: String(product.inventory.stock_quantity ?? 0),
          display_available: Boolean(product.inventory.display_available),
          display_stock_quantity: Boolean(product.inventory.display_stock_quantity),
          min_stock_quantity: String(product.inventory.min_stock_quantity ?? 0),
          low_stock_activity: Number(product.inventory.low_stock_activity ?? 0),
          threshold_quantity: String(product.inventory.threshold_quantity ?? 0),
          allow_backorder: Boolean(product.inventory.allow_backorder),
          min_cart_quantity: String(product.min_cart_quantity ?? 1),
          max_cart_quantity: String(product.max_cart_quantity ?? 1),
          weight: String(product.shipping.weight ?? 0),
          length: String(product.shipping.length ?? 0),
          width: String(product.shipping.width ?? 0),
          height: String(product.shipping.height ?? 0),
          shipping_class: (product.shipping.class as string) ?? '',
          product_url: product.product_url ?? '',
          button_text: product.button_text ?? '',
          vehicle_year: product.vehicle.year ? String(product.vehicle.year) : '',
          vehicle_model: (product.vehicle.model as string) ?? '',
          vehicle_engine: (product.vehicle.engine as string) ?? '',
          vehicle_engine_type: (product.vehicle.engine_type as string) ?? '',
          meta_title: product.meta.title ?? '',
          meta_description: product.meta.description ?? '',
          meta_keywords: product.meta.keywords ?? '',
          attribute_ids: data.raw.attribute_ids ?? [],
          grouped_ids: data.raw.grouped_ids ?? [],
          up_sell_ids: data.raw.up_sell_ids ?? [],
          cross_sell_ids: data.raw.cross_sell_ids ?? [],
          variations: (product.variations ?? []).map((variation) => ({
            id: variation.id,
            attribute_values: variation.attribute_values,
            regular_price: String(variation.regular_price),
            sale_price: String(variation.sale_price),
            sku: variation.sku ?? '',
            stock_quantity: String(variation.stock_quantity),
          })),
          branch_stock: (data.branch_inventory ?? []).map((row) => ({
            branch_id: row.branch_id,
            variation_id: row.variation_id,
            stock_quantity: String(row.stock_quantity),
            min_stock_quantity: String(row.min_stock_quantity),
            shelf_location: row.shelf_location ?? '',
          })),
        }));

        setExistingImages(
          (product.gallery ?? []).map((image) => ({
            id: image.id,
            url: image.url,
            isMain: Boolean(image.is_main),
          })),
        );
      })
      .catch((error) => toastError(error instanceof ApiError ? error.message : 'Could not load the product'))
      .finally(() => setLoading(false));
  }, [productId]);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const runAi = async () => {
    if (!form.name.trim()) {
      toastError('Enter the product name first');
      return;
    }

    setAiBusy(true);

    try {
      const data = await api<{
        content: {
          short_description?: string;
          description?: string;
          meta_title?: string;
          meta_description?: string;
          meta_keywords?: string;
          specifications?: { key: string; value: string }[];
        };
      }>('/admin/products/ai-generate', {
        method: 'POST',
        auth: 'admin',
        body: {
          name: form.name,
          brand: meta?.brands.find((brand) => String(brand.id) === form.brand_id)?.name,
          category: meta?.categories.find((category) => form.category_ids.includes(category.id))?.name,
          vehicle_year: form.vehicle_year,
          vehicle_model: form.vehicle_model,
          vehicle_engine: form.vehicle_engine,
          vehicle_engine_type: form.vehicle_engine_type,
        },
      });

      setForm((current) => ({
        ...current,
        short_description: data.content.short_description ?? current.short_description,
        description: data.content.description ?? current.description,
        meta_title: data.content.meta_title ?? current.meta_title,
        meta_description: data.content.meta_description ?? current.meta_description,
        meta_keywords: data.content.meta_keywords ?? current.meta_keywords,
        specifications: data.content.specifications ?? current.specifications,
      }));

      toastSuccess('AI content generated');
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'AI generation failed');
    } finally {
      setAiBusy(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const body = new FormData();

      const append = (key: string, value: unknown) => {
        if (value === undefined || value === null) return;
        body.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
      };

      Object.entries(form).forEach(([key, value]) => {
        if (Array.isArray(value)) return;
        append(key, value);
      });

      form.category_ids.forEach((id) => body.append('category_ids[]', String(id)));
      form.attribute_ids.forEach((id) => body.append('attribute_ids[]', String(id)));
      form.grouped_ids.forEach((id) => body.append('grouped_ids[]', String(id)));
      form.up_sell_ids.forEach((id) => body.append('up_sell_ids[]', String(id)));
      form.cross_sell_ids.forEach((id) => body.append('cross_sell_ids[]', String(id)));

      form.specifications.forEach((spec, index) => {
        body.append(`specifications[${index}][key]`, spec.key);
        body.append(`specifications[${index}][value]`, spec.value);
      });

      form.variations.forEach((variation, index) => {
        if (variation.id) body.append(`variations[${index}][id]`, String(variation.id));
        variation.attribute_values.forEach((value) => body.append(`variations[${index}][attribute_values][]`, String(value)));
        body.append(`variations[${index}][regular_price]`, variation.regular_price || '0');
        body.append(`variations[${index}][sale_price]`, variation.sale_price || '0');
        body.append(`variations[${index}][sku]`, variation.sku);
        body.append(`variations[${index}][stock_quantity]`, variation.stock_quantity || '0');
      });

      form.branch_stock.forEach((row, index) => {
        body.append(`branch_stock[${index}][branch_id]`, String(row.branch_id));
        body.append(`branch_stock[${index}][variation_id]`, String(row.variation_id));
        body.append(`branch_stock[${index}][stock_quantity]`, row.stock_quantity || '0');
        body.append(`branch_stock[${index}][min_stock_quantity]`, row.min_stock_quantity || '0');
        body.append(`branch_stock[${index}][shelf_location]`, row.shelf_location);
      });

      images.forEach((file) => body.append('images[]', file));
      if (mainImageIndex !== null) body.append('main_image_index', String(mainImageIndex));

      // Product photography is the only heavy part of this form, so the save
      // reports real upload progress rather than an indeterminate spinner.
      if (images.length > 0) setUploadPercent(0);

      const { data, message } = await uploadWithProgress<{ product_id: number }>(
        productId ? `/admin/products/${productId}` : '/admin/products',
        body,
        { auth: 'admin', onProgress: images.length > 0 ? setUploadPercent : undefined },
      );

      toastSuccess(message);
      router.push(`/admin/products/${data.product_id ?? productId}`);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not save the product');
    } finally {
      setBusy(false);
      setUploadPercent(null);
    }
  };

  if (loading || !meta) return <div className="vp-skeleton" style={{ height: 320 }} />;

  const selectedAttributes = meta.attributes.filter((attribute) => form.attribute_ids.includes(attribute.id));

  return (
    <>
      <AdminPageHeader title={productId ? 'Edit product' : 'Add product'}>
        <Link href="/admin/products" className="btn btn--sm btn-outline--primary">
          Back to products
        </Link>
      </AdminPageHeader>

      <form onSubmit={submit}>
        <div className="row gy-4">
          <div className="col-lg-8">
            <Card
              title="Basics"
              actions={
                can('product.ai_generate') && (
                  <button className="btn btn--sm btn--primary" type="button" onClick={runAi} disabled={aiBusy}>
                    <i className="las la-magic" /> {aiBusy ? 'Generating…' : 'Generate with AI'}
                  </button>
                )
              }
            >
              <div className="row">
                <Field label="Product name" required className="col-12">
                  <input className="form-control" required value={form.name} onChange={update('name')} />
                </Field>
                <Field label="Product type" required>
                  <select className="form-select" value={form.product_type} onChange={update('product_type')}>
                    {meta.product_types.map((type) => (
                      <option value={type.value} key={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Brand">
                  <select className="form-select" value={form.brand_id} onChange={update('brand_id')}>
                    <option value="">No brand</option>
                    {meta.brands.map((brand) => (
                      <option value={brand.id} key={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Categories" className="col-12">
                  <select
                    className="form-select"
                    multiple
                    size={6}
                    value={form.category_ids.map(String)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category_ids: Array.from(event.target.selectedOptions).map((option) => Number(option.value)),
                      }))
                    }
                  >
                    {meta.categories.map((category) => (
                      <option value={category.id} key={category.id}>
                        {category.parent_id ? '— ' : ''}
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Short description" className="col-12">
                  <textarea className="form-control" rows={3} value={form.short_description} onChange={update('short_description')} />
                </Field>
                <Field label="Full description" className="col-12" hint="HTML is allowed.">
                  <textarea className="form-control" rows={8} value={form.description} onChange={update('description')} />
                </Field>
              </div>
            </Card>

            <Card title="Pricing" className="mt-4">
              <div className="row">
                <Field label="Regular price (TZS)" required>
                  <input className="form-control" type="number" step="1" min="0" required value={form.regular_price} onChange={update('regular_price')} />
                </Field>
                <Field label="Sale price (TZS)" hint="Leave 0 for no discount.">
                  <input className="form-control" type="number" step="1" min="0" value={form.sale_price} onChange={update('sale_price')} />
                </Field>
                <Field label="Tax class">
                  <select className="form-select" value={form.tax_class} onChange={update('tax_class')}>
                    <option value="">No tax</option>
                    {meta.taxes.map((tax) => (
                      <option value={tax.id} key={tax.id}>
                        {tax.name} ({tax.rate}%)
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tax status">
                  <select className="form-select" value={form.tax_status} onChange={update('tax_status')}>
                    <option value="taxable">Taxable</option>
                    <option value="none">None</option>
                  </select>
                </Field>
              </div>
            </Card>

            <Card title="Inventory" className="mt-4">
              <div className="row">
                <Field label="SKU">
                  <input className="form-control" value={form.sku} onChange={update('sku')} />
                </Field>
                <Field label="GTIN / barcode">
                  <input className="form-control" value={form.gtin} onChange={update('gtin')} />
                </Field>
                <Field label="Track inventory">
                  <select className="form-select" value={form.inventory_type} onChange={update('inventory_type')}>
                    <option value={1}>Track stock</option>
                    <option value={0}>Do not track</option>
                  </select>
                </Field>
                <Field label="Stock unit">
                  <select className="form-select" value={form.stock_unit_id} onChange={update('stock_unit_id')}>
                    <option value="">Choose a unit</option>
                    {meta.stock_units.map((unit) => (
                      <option value={unit.id} key={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Low stock threshold">
                  <input className="form-control" type="number" min="0" value={form.min_stock_quantity} onChange={update('min_stock_quantity')} />
                </Field>
                <Field label="When stock is low">
                  <select className="form-select" value={form.low_stock_activity} onChange={update('low_stock_activity')}>
                    {meta.low_stock_activities.map((activity) => (
                      <option value={activity.value} key={activity.value}>
                        {activity.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Minimum cart quantity">
                  <input className="form-control" type="number" min="0" value={form.min_cart_quantity} onChange={update('min_cart_quantity')} />
                </Field>
                <Field label="Maximum cart quantity">
                  <input className="form-control" type="number" min="0" value={form.max_cart_quantity} onChange={update('max_cart_quantity')} />
                </Field>
              </div>
            </Card>

            <Card title="Branch stock" className="mt-4">
              <p>Set how many units each VIPURI branch holds. The catalogue total is the sum of these rows.</p>
              <div className="table-responsive">
                <table className="table table--light style--two">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Quantity</th>
                      <th>Low-stock threshold</th>
                      <th>Shelf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.branches.map((branch) => {
                      const row = form.branch_stock.find((entry) => entry.branch_id === branch.id && entry.variation_id === 0);

                      const setValue = (field: 'stock_quantity' | 'min_stock_quantity' | 'shelf_location', value: string) =>
                        setForm((current) => {
                          const next = [...current.branch_stock];
                          const index = next.findIndex((entry) => entry.branch_id === branch.id && entry.variation_id === 0);

                          if (index >= 0) {
                            next[index] = { ...next[index], [field]: value };
                          } else {
                            next.push({
                              branch_id: branch.id,
                              variation_id: 0,
                              stock_quantity: field === 'stock_quantity' ? value : '0',
                              min_stock_quantity: field === 'min_stock_quantity' ? value : '0',
                              shelf_location: field === 'shelf_location' ? value : '',
                            });
                          }

                          return { ...current, branch_stock: next };
                        });

                      return (
                        <tr key={branch.id}>
                          <td>
                            {branch.name} <span style={{ fontSize: 13 }}>({branch.code})</span>
                          </td>
                          <td>
                            <input
                              className="form-control"
                              type="number"
                              min="0"
                              value={row?.stock_quantity ?? '0'}
                              onChange={(event) => setValue('stock_quantity', event.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="form-control"
                              type="number"
                              min="0"
                              value={row?.min_stock_quantity ?? '0'}
                              onChange={(event) => setValue('min_stock_quantity', event.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="form-control"
                              value={row?.shelf_location ?? ''}
                              onChange={(event) => setValue('shelf_location', event.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Vehicle fitment" className="mt-4">
              <div className="row">
                <Field label="Model year">
                  <input className="form-control" type="number" min="1900" max="2100" value={form.vehicle_year} onChange={update('vehicle_year')} />
                </Field>
                <Field label="Vehicle model">
                  <input className="form-control" value={form.vehicle_model} onChange={update('vehicle_model')} />
                </Field>
                <Field label="Engine">
                  <input className="form-control" value={form.vehicle_engine} onChange={update('vehicle_engine')} />
                </Field>
                <Field label="Engine type">
                  <input className="form-control" value={form.vehicle_engine_type} onChange={update('vehicle_engine_type')} />
                </Field>
              </div>
            </Card>

            <Card title="Specifications" className="mt-4">
              {form.specifications.map((spec, index) => (
                <div className="row align-items-end mb-2" key={index}>
                  <div className="col-md-5">
                    <input
                      className="form-control"
                      placeholder="Label"
                      value={spec.key}
                      onChange={(event) =>
                        setForm((current) => {
                          const next = [...current.specifications];
                          next[index] = { ...next[index], key: event.target.value };
                          return { ...current, specifications: next };
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <input
                      className="form-control"
                      placeholder="Value"
                      value={spec.value}
                      onChange={(event) =>
                        setForm((current) => {
                          const next = [...current.specifications];
                          next[index] = { ...next[index], value: event.target.value };
                          return { ...current, specifications: next };
                        })
                      }
                    />
                  </div>
                  <div className="col-md-1">
                    <button
                      className="btn btn--sm btn-outline--danger"
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          specifications: current.specifications.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <i className="las la-times" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="btn btn--sm btn-outline--primary mt-2"
                type="button"
                onClick={() => setForm((current) => ({ ...current, specifications: [...current.specifications, { key: '', value: '' }] }))}
              >
                <i className="las la-plus" /> Add specification
              </button>
            </Card>

            {form.product_type === 'variable' && (
              <Card title="Variations" className="mt-4">
                <Field label="Attributes used for variations" className="col-12">
                  <select
                    className="form-select"
                    multiple
                    size={4}
                    value={form.attribute_ids.map(String)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        attribute_ids: Array.from(event.target.selectedOptions).map((option) => Number(option.value)),
                      }))
                    }
                  >
                    {meta.attributes.map((attribute) => (
                      <option value={attribute.id} key={attribute.id}>
                        {attribute.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {selectedAttributes.length > 0 && (
                  <>
                    <div className="table-responsive mt-3">
                      <table className="table table--light style--two">
                        <thead>
                          <tr>
                            <th>Options</th>
                            <th>Regular price</th>
                            <th>Sale price</th>
                            <th>SKU</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {form.variations.map((variation, index) => (
                            <tr key={index}>
                              <td>
                                <select
                                  className="form-select"
                                  multiple
                                  size={Math.min(4, selectedAttributes.reduce((sum, attribute) => sum + attribute.values.length, 0))}
                                  value={variation.attribute_values.map(String)}
                                  onChange={(event) =>
                                    setForm((current) => {
                                      const next = [...current.variations];
                                      next[index] = {
                                        ...next[index],
                                        attribute_values: Array.from(event.target.selectedOptions).map((option) => Number(option.value)),
                                      };
                                      return { ...current, variations: next };
                                    })
                                  }
                                >
                                  {selectedAttributes.map((attribute) => (
                                    <optgroup label={attribute.name} key={attribute.id}>
                                      {attribute.values.map((value) => (
                                        <option value={value.id} key={value.id}>
                                          {value.name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  className="form-control"
                                  type="number"
                                  value={variation.regular_price}
                                  onChange={(event) =>
                                    setForm((current) => {
                                      const next = [...current.variations];
                                      next[index] = { ...next[index], regular_price: event.target.value };
                                      return { ...current, variations: next };
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="form-control"
                                  type="number"
                                  value={variation.sale_price}
                                  onChange={(event) =>
                                    setForm((current) => {
                                      const next = [...current.variations];
                                      next[index] = { ...next[index], sale_price: event.target.value };
                                      return { ...current, variations: next };
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="form-control"
                                  value={variation.sku}
                                  onChange={(event) =>
                                    setForm((current) => {
                                      const next = [...current.variations];
                                      next[index] = { ...next[index], sku: event.target.value };
                                      return { ...current, variations: next };
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <button
                                  className="btn btn--sm btn-outline--danger"
                                  type="button"
                                  onClick={() =>
                                    setForm((current) => ({
                                      ...current,
                                      variations: current.variations.filter((_, i) => i !== index),
                                    }))
                                  }
                                >
                                  <i className="las la-times" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      className="btn btn--sm btn-outline--primary"
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          variations: [
                            ...current.variations,
                            { attribute_values: [], regular_price: current.regular_price, sale_price: '0', sku: '', stock_quantity: '0' },
                          ],
                        }))
                      }
                    >
                      <i className="las la-plus" /> Add variation
                    </button>
                  </>
                )}
              </Card>
            )}
          </div>

          <div className="col-lg-4">
            <Card title="Publish">
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="p-status"
                  checked={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.checked }))}
                />
                <label className="form-check-label" htmlFor="p-status">
                  Published
                </label>
              </div>
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="p-featured"
                  checked={form.is_featured}
                  onChange={(event) => setForm((current) => ({ ...current, is_featured: event.target.checked }))}
                />
                <label className="form-check-label" htmlFor="p-featured">
                  Featured
                </label>
              </div>
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="p-deals"
                  checked={form.show_deals}
                  onChange={(event) => setForm((current) => ({ ...current, show_deals: event.target.checked }))}
                />
                <label className="form-check-label" htmlFor="p-deals">
                  Show in deals
                </label>
              </div>
              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="p-limited"
                  checked={form.limited_stock}
                  onChange={(event) => setForm((current) => ({ ...current, limited_stock: event.target.checked }))}
                />
                <label className="form-check-label" htmlFor="p-limited">
                  Limited stock section
                </label>
              </div>

              <button className="btn btn--primary w-100" type="submit" disabled={busy}>
                {busy ? 'Saving…' : productId ? 'Update product' : 'Create product'}
              </button>
            </Card>

            <Card title="Images" className="mt-4">
              <GalleryPicker
                existing={existingImages}
                onDeleteExisting={async (id) => {
                  try {
                    await apiWithMessage(`/admin/products/media/${id}`, { method: 'DELETE', auth: 'admin' });
                    setExistingImages((current) => current.filter((row) => row.id !== id));
                  } catch (error) {
                    toastError(error instanceof ApiError ? error.message : 'Could not remove the image');
                  }
                }}
                onSetExistingMain={
                  productId
                    ? async (id) => {
                        try {
                          await apiWithMessage(`/admin/products/media/${id}/main`, { method: 'POST', auth: 'admin' });
                          setExistingImages((current) =>
                            current.map((row) => ({ ...row, isMain: row.id === id })),
                          );
                        } catch (error) {
                          toastError(error instanceof ApiError ? error.message : 'Could not set the main image');
                        }
                      }
                    : undefined
                }
                files={images}
                onFilesChange={setImages}
                mainIndex={mainImageIndex}
                onMainIndexChange={setMainImageIndex}
                progress={uploadPercent}
              />
            </Card>

            <Card title="Shipping" className="mt-4">
              <div className="row">
                <Field label="Weight (kg)" className="col-6">
                  <input className="form-control" type="number" step="0.01" value={form.weight} onChange={update('weight')} />
                </Field>
                <Field label="Class" className="col-6">
                  <select className="form-select" value={form.shipping_class} onChange={update('shipping_class')}>
                    <option value="">Standard</option>
                    {meta.shipping_classes.map((cls) => (
                      <option value={cls.name} key={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Length" className="col-4">
                  <input className="form-control" type="number" step="0.01" value={form.length} onChange={update('length')} />
                </Field>
                <Field label="Width" className="col-4">
                  <input className="form-control" type="number" step="0.01" value={form.width} onChange={update('width')} />
                </Field>
                <Field label="Height" className="col-4">
                  <input className="form-control" type="number" step="0.01" value={form.height} onChange={update('height')} />
                </Field>
              </div>
            </Card>

            <Card title="SEO" className="mt-4">
              <div className="row">
                <Field label="Meta title" className="col-12">
                  <input className="form-control" value={form.meta_title} onChange={update('meta_title')} />
                </Field>
                <Field label="Meta description" className="col-12">
                  <textarea className="form-control" rows={3} value={form.meta_description} onChange={update('meta_description')} />
                </Field>
                <Field label="Meta keywords" className="col-12">
                  <input className="form-control" value={form.meta_keywords} onChange={update('meta_keywords')} />
                </Field>
              </div>
            </Card>

            {form.product_type === 'external' && (
              <Card title="External product" className="mt-4">
                <div className="row">
                  <Field label="Product URL" className="col-12">
                    <input className="form-control" type="url" value={form.product_url} onChange={update('product_url')} />
                  </Field>
                  <Field label="Button text" className="col-12">
                    <input className="form-control" value={form.button_text} onChange={update('button_text')} />
                  </Field>
                </div>
              </Card>
            )}
          </div>
        </div>
      </form>
    </>
  );
}
