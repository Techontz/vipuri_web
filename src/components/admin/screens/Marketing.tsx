'use client';

import { useCallback, useEffect, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card, DataTable, Field, Modal, StatusBadge } from '@/components/admin/ui';
import { ApiError, api, apiWithMessage, downloadFile } from '@/lib/api';
import { formatDate, showAmount } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Pagination as PaginationMeta } from '@/types';

/* ================================== Coupons =============================== */

type CouponRow = {
  id: number;
  name: string | null;
  code: string;
  description: string | null;
  discount_type: number;
  amount: number;
  max_discount: number;
  minimum_spend: number;
  maximum_spend: number;
  limit_per_coupon: number | null;
  limit_per_customer: number | null;
  total_uses: number;
  usages_count: number;
  exclude_sale_items: boolean;
  exclude_offers: boolean;
  expiry_date: string | null;
  is_expired: boolean;
  status: boolean;
};

const EMPTY_COUPON = {
  name: '',
  code: '',
  description: '',
  discount_type: 1,
  amount: '',
  max_discount: '0',
  minimum_spend: '0',
  maximum_spend: '0',
  limit_per_coupon: '',
  limit_per_customer: '',
  exclude_sale_items: false,
  exclude_offers: false,
  expiry_date: '',
  status: true,
};

export function CouponsScreen() {
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_COUPON });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ coupons: CouponRow[]; pagination: PaginationMeta }>(`/admin/coupons?page=${page}`, {
        auth: 'admin',
      });
      setRows(data.coupons ?? []);
      setPagination(data.pagination ?? null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load coupons');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminPageHeader title="Coupons">
        <button
          className="btn btn--primary btn--sm"
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm({ ...EMPTY_COUPON });
            setModalOpen(true);
          }}
        >
          <i className="las la-plus" /> Add coupon
        </button>
      </AdminPageHeader>

      <Card>
        <DataTable
          rows={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          empty="No coupons yet"
          columns={[
            {
              key: 'code',
              label: 'Coupon',
              render: (row) => (
                <>
                  <strong>{row.code}</strong>
                  <span className="d-block" style={{ fontSize: 13 }}>
                    {row.name}
                  </span>
                </>
              ),
            },
            {
              key: 'discount',
              label: 'Discount',
              render: (row) => (row.discount_type === 1 ? `${row.amount}%` : showAmount(row.amount)),
            },
            { key: 'spend', label: 'Min spend', render: (row) => (row.minimum_spend > 0 ? showAmount(row.minimum_spend) : '—') },
            { key: 'uses', label: 'Used', align: 'end', render: (row) => `${row.total_uses}${row.limit_per_coupon ? ` / ${row.limit_per_coupon}` : ''}` },
            { key: 'expiry', label: 'Expires', render: (row) => (row.expiry_date ? formatDate(row.expiry_date) : 'Never') },
            {
              key: 'status',
              label: 'Status',
              render: (row) => (row.is_expired ? <span className="badge badge--danger">Expired</span> : <StatusBadge active={row.status} />),
            },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (row) => (
                <div className="d-flex gap-2 justify-content-end">
                  <button
                    className="btn btn--sm btn-outline--primary"
                    type="button"
                    onClick={() => {
                      setEditingId(row.id);
                      setForm({
                        name: row.name ?? '',
                        code: row.code,
                        description: row.description ?? '',
                        discount_type: row.discount_type,
                        amount: String(row.amount),
                        max_discount: String(row.max_discount),
                        minimum_spend: String(row.minimum_spend),
                        maximum_spend: String(row.maximum_spend),
                        limit_per_coupon: row.limit_per_coupon ? String(row.limit_per_coupon) : '',
                        limit_per_customer: row.limit_per_customer ? String(row.limit_per_customer) : '',
                        exclude_sale_items: row.exclude_sale_items,
                        exclude_offers: row.exclude_offers,
                        expiry_date: row.expiry_date ?? '',
                        status: row.status,
                      });
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn--sm btn-outline--warning"
                    type="button"
                    onClick={async () => {
                      const { message } = await apiWithMessage(`/admin/coupons/${row.id}/status`, { method: 'POST', auth: 'admin' });
                      toastSuccess(message);
                      await load();
                    }}
                  >
                    Toggle
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} title={editingId ? 'Edit coupon' : 'Add coupon'} onClose={() => setModalOpen(false)} size="lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);

            try {
              const { message } = await apiWithMessage(editingId ? `/admin/coupons/${editingId}` : '/admin/coupons', {
                method: 'POST',
                auth: 'admin',
                body: {
                  ...form,
                  amount: Number(form.amount),
                  max_discount: Number(form.max_discount),
                  minimum_spend: Number(form.minimum_spend),
                  maximum_spend: Number(form.maximum_spend),
                  limit_per_coupon: form.limit_per_coupon ? Number(form.limit_per_coupon) : null,
                  limit_per_customer: form.limit_per_customer ? Number(form.limit_per_customer) : null,
                  expiry_date: form.expiry_date || null,
                },
              });

              toastSuccess(message);
              setModalOpen(false);
              await load();
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : 'Could not save the coupon');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="row">
            <Field label="Code" required>
              <input className="form-control" required value={form.code} onChange={(event) => setForm((c) => ({ ...c, code: event.target.value.toUpperCase() }))} />
            </Field>
            <Field label="Name">
              <input className="form-control" value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
            </Field>
            <Field label="Discount type" required>
              <select className="form-select" value={form.discount_type} onChange={(event) => setForm((c) => ({ ...c, discount_type: Number(event.target.value) }))}>
                <option value={1}>Percentage</option>
                <option value={2}>Fixed cart discount</option>
                <option value={3}>Fixed product discount</option>
              </select>
            </Field>
            <Field label={form.discount_type === 1 ? 'Percentage' : 'Amount (TZS)'} required>
              <input className="form-control" type="number" min="0" required value={form.amount} onChange={(event) => setForm((c) => ({ ...c, amount: event.target.value }))} />
            </Field>
            <Field label="Maximum discount (TZS)" hint="0 for no cap.">
              <input className="form-control" type="number" min="0" value={form.max_discount} onChange={(event) => setForm((c) => ({ ...c, max_discount: event.target.value }))} />
            </Field>
            <Field label="Minimum spend (TZS)">
              <input className="form-control" type="number" min="0" value={form.minimum_spend} onChange={(event) => setForm((c) => ({ ...c, minimum_spend: event.target.value }))} />
            </Field>
            <Field label="Uses per coupon">
              <input className="form-control" type="number" min="0" value={form.limit_per_coupon} onChange={(event) => setForm((c) => ({ ...c, limit_per_coupon: event.target.value }))} />
            </Field>
            <Field label="Uses per customer">
              <input className="form-control" type="number" min="0" value={form.limit_per_customer} onChange={(event) => setForm((c) => ({ ...c, limit_per_customer: event.target.value }))} />
            </Field>
            <Field label="Expiry date">
              <input className="form-control" type="date" value={form.expiry_date} onChange={(event) => setForm((c) => ({ ...c, expiry_date: event.target.value }))} />
            </Field>
            <Field label="Description" className="col-12">
              <input className="form-control" value={form.description} onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))} />
            </Field>

            <div className="col-12 d-flex flex-wrap gap-4">
              {(
                [
                  ['exclude_sale_items', 'Exclude sale items'],
                  ['exclude_offers', 'Exclude items already on offer'],
                  ['status', 'Active'],
                ] as const
              ).map(([key, label]) => (
                <div className="form-check" key={key}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`coupon-${key}`}
                    checked={form[key] as boolean}
                    onChange={(event) => setForm((c) => ({ ...c, [key]: event.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor={`coupon-${key}`}>
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="d-flex gap-2 mt-4">
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save coupon'}
            </button>
            <button className="btn btn-outline--primary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ============================ Offers & campaigns ========================== */

type PromotionRow = {
  id: number;
  name: string;
  description: string | null;
  discount_type: number;
  amount: number;
  start_at: string | null;
  end_at: string | null;
  is_running: boolean;
  show_on_section: boolean;
  status: boolean;
  products_count?: number;
  categories_count?: number;
  priority?: number;
};

function PromotionScreen({ kind }: { kind: 'offers' | 'campaigns' }) {
  const label = kind === 'offers' ? 'Offer' : 'Campaign';

  const [rows, setRows] = useState<PromotionRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    discount_type: 1,
    amount: '',
    priority: '1',
    start_at: '',
    end_at: '',
    show_on_section: true,
    status: true,
    product_ids: [] as number[],
    category_ids: [] as number[],
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<Record<string, unknown>>(`/admin/${kind}?page=${page}`, { auth: 'admin' });
      setRows((data[kind] as PromotionRow[]) ?? []);
      setPagination((data.pagination as PaginationMeta) ?? null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : `Could not load ${kind}`);
    } finally {
      setLoading(false);
    }
  }, [kind, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<{ categories: { id: number; name: string }[] }>('/admin/products/form-data', { auth: 'admin' })
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => undefined);
  }, []);

  const searchProducts = async (term: string) => {
    try {
      const data = await api<{ products: { id: number; name: string }[] }>(
        `/admin/products/search?search=${encodeURIComponent(term)}`,
        { auth: 'admin' },
      );
      setProducts(data.products ?? []);
    } catch {
      setProducts([]);
    }
  };

  return (
    <>
      <AdminPageHeader title={`${label}s`}>
        <button
          className="btn btn--primary btn--sm"
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm({
              name: '',
              description: '',
              discount_type: 1,
              amount: '',
              priority: '1',
              start_at: '',
              end_at: '',
              show_on_section: true,
              status: true,
              product_ids: [],
              category_ids: [],
            });
            setModalOpen(true);
          }}
        >
          <i className="las la-plus" /> Add {label.toLowerCase()}
        </button>
      </AdminPageHeader>

      <Card>
        <DataTable
          rows={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          empty={`No ${kind} yet`}
          columns={[
            { key: 'name', label: label, render: (row) => <strong>{row.name}</strong> },
            { key: 'discount', label: 'Discount', render: (row) => (row.discount_type === 1 ? `${row.amount}%` : showAmount(row.amount)) },
            { key: 'window', label: 'Runs', render: (row) => `${formatDate(row.start_at)} → ${formatDate(row.end_at)}` },
            { key: 'scope', label: 'Applies to', render: (row) => `${row.products_count ?? 0} products, ${row.categories_count ?? 0} categories` },
            { key: 'running', label: 'Running', render: (row) => (row.is_running ? <span className="badge badge--success">Live</span> : <span className="badge badge--warning">Scheduled</span>) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge active={row.status} /> },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (row) => (
                <div className="d-flex gap-2 justify-content-end">
                  <button
                    className="btn btn--sm btn-outline--primary"
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await api<Record<string, unknown>>(`/admin/${kind}/${row.id}`, { auth: 'admin' });
                        const record = (data[kind === 'offers' ? 'offer' : 'campaign'] as PromotionRow) ?? row;

                        setEditingId(row.id);
                        setForm({
                          name: record.name,
                          description: record.description ?? '',
                          discount_type: record.discount_type,
                          amount: String(record.amount),
                          priority: String(record.priority ?? 1),
                          start_at: record.start_at ? record.start_at.slice(0, 16) : '',
                          end_at: record.end_at ? record.end_at.slice(0, 16) : '',
                          show_on_section: record.show_on_section,
                          status: record.status,
                          product_ids: (data.product_ids as number[]) ?? [],
                          category_ids: (data.category_ids as number[]) ?? [],
                        });
                        setModalOpen(true);
                      } catch (error) {
                        toastError(error instanceof ApiError ? error.message : 'Could not load the record');
                      }
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn--sm btn-outline--warning"
                    type="button"
                    onClick={async () => {
                      const { message } = await apiWithMessage(`/admin/${kind}/${row.id}/status`, { method: 'POST', auth: 'admin' });
                      toastSuccess(message);
                      await load();
                    }}
                  >
                    Toggle
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} title={editingId ? `Edit ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`} onClose={() => setModalOpen(false)} size="lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);

            try {
              const body = new FormData();
              body.append('name', form.name);
              body.append('description', form.description);
              body.append('discount_type', String(form.discount_type));
              body.append('amount', form.amount);
              body.append('start_at', form.start_at);
              body.append('end_at', form.end_at);
              body.append('show_on_section', form.show_on_section ? '1' : '0');
              body.append('status', form.status ? '1' : '0');
              if (kind === 'offers') body.append('priority', form.priority);
              form.product_ids.forEach((id) => body.append('product_ids[]', String(id)));
              form.category_ids.forEach((id) => body.append('category_ids[]', String(id)));

              const { message } = await apiWithMessage(editingId ? `/admin/${kind}/${editingId}` : `/admin/${kind}`, {
                method: 'POST',
                auth: 'admin',
                body,
              });

              toastSuccess(message);
              setModalOpen(false);
              await load();
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : `Could not save the ${label.toLowerCase()}`);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="row">
            <Field label="Name" required className="col-12">
              <input className="form-control" required value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
            </Field>
            <Field label="Discount type" required>
              <select className="form-select" value={form.discount_type} onChange={(event) => setForm((c) => ({ ...c, discount_type: Number(event.target.value) }))}>
                <option value={1}>Percentage</option>
                <option value={2}>Fixed amount</option>
              </select>
            </Field>
            <Field label={form.discount_type === 1 ? 'Percentage' : 'Amount (TZS)'} required>
              <input className="form-control" type="number" min="0" required value={form.amount} onChange={(event) => setForm((c) => ({ ...c, amount: event.target.value }))} />
            </Field>
            <Field label="Starts" required>
              <input className="form-control" type="datetime-local" required value={form.start_at} onChange={(event) => setForm((c) => ({ ...c, start_at: event.target.value }))} />
            </Field>
            <Field label="Ends" required>
              <input className="form-control" type="datetime-local" required value={form.end_at} onChange={(event) => setForm((c) => ({ ...c, end_at: event.target.value }))} />
            </Field>
            {kind === 'offers' && (
              <Field label="Priority" hint="Lower runs first when several offers match.">
                <input className="form-control" type="number" min="1" value={form.priority} onChange={(event) => setForm((c) => ({ ...c, priority: event.target.value }))} />
              </Field>
            )}
            <Field label="Description" className="col-12">
              <input className="form-control" value={form.description} onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))} />
            </Field>

            <Field label="Categories" className="col-12">
              <select
                className="form-select"
                multiple
                size={5}
                value={form.category_ids.map(String)}
                onChange={(event) =>
                  setForm((c) => ({ ...c, category_ids: Array.from(event.target.selectedOptions).map((option) => Number(option.value)) }))
                }
              >
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Specific products" className="col-12">
              <input className="form-control mb-2" placeholder="Search products…" onChange={(event) => void searchProducts(event.target.value)} />
              <select
                className="form-select"
                multiple
                size={5}
                value={form.product_ids.map(String)}
                onChange={(event) =>
                  setForm((c) => ({ ...c, product_ids: Array.from(event.target.selectedOptions).map((option) => Number(option.value)) }))
                }
              >
                {products.map((product) => (
                  <option value={product.id} key={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="col-12 d-flex gap-4">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="promo-section" checked={form.show_on_section} onChange={(event) => setForm((c) => ({ ...c, show_on_section: event.target.checked }))} />
                <label className="form-check-label" htmlFor="promo-section">
                  Show on the storefront
                </label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="promo-status" checked={form.status} onChange={(event) => setForm((c) => ({ ...c, status: event.target.checked }))} />
                <label className="form-check-label" htmlFor="promo-status">
                  Active
                </label>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 mt-4">
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : `Save ${label.toLowerCase()}`}
            </button>
            <button className="btn btn-outline--primary" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export const OffersScreen = () => <PromotionScreen kind="offers" />;
export const CampaignsScreen = () => <PromotionScreen kind="campaigns" />;

/* ================================ Subscribers ============================= */

export function SubscribersScreen() {
  const [rows, setRows] = useState<{ id: number; email: string; created_at: string }[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState({ subject: '', message: '' });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ subscribers: { id: number; email: string; created_at: string }[]; pagination: PaginationMeta }>(
        `/admin/subscribers?page=${page}&search=${encodeURIComponent(search)}`,
        { auth: 'admin' },
      );
      setRows(data.subscribers ?? []);
      setPagination(data.pagination ?? null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load subscribers');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminPageHeader title="Subscribers">
        <button className="btn btn--primary btn--sm" type="button" onClick={() => setEmailOpen(true)}>
          <i className="las la-envelope" /> E-mail subscribers
        </button>
      </AdminPageHeader>

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label">Search</label>
            <input className="form-control" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
        </div>

        <DataTable
          rows={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          empty="No subscribers yet"
          columns={[
            { key: 'email', label: 'E-mail', render: (row) => row.email },
            { key: 'date', label: 'Subscribed', render: (row) => formatDate(row.created_at) },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (row) => (
                <button
                  className="btn btn--sm btn-outline--danger"
                  type="button"
                  onClick={async () => {
                    const { message } = await apiWithMessage(`/admin/subscribers/${row.id}`, { method: 'DELETE', auth: 'admin' });
                    toastSuccess(message);
                    await load();
                  }}
                >
                  Remove
                </button>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={emailOpen} title="E-mail all subscribers" onClose={() => setEmailOpen(false)} size="lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault();

            try {
              const { message } = await apiWithMessage('/admin/subscribers/email', { method: 'POST', auth: 'admin', body: email });
              toastSuccess(message);
              setEmailOpen(false);
              setEmail({ subject: '', message: '' });
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : 'Could not send the e-mail');
            }
          }}
        >
          <Field label="Subject" required className="col-12">
            <input className="form-control" required value={email.subject} onChange={(event) => setEmail((c) => ({ ...c, subject: event.target.value }))} />
          </Field>
          <Field label="Message" required className="col-12">
            <textarea className="form-control" rows={8} required value={email.message} onChange={(event) => setEmail((c) => ({ ...c, message: event.target.value }))} />
          </Field>
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn--primary" type="submit">
              Send
            </button>
            <button className="btn btn-outline--primary" type="button" onClick={() => setEmailOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ================================= Shipping =============================== */

type ShippingPayload = {
  zones: { id: number; name: string; status: boolean }[];
  methods: { id: number; name: string; description: string | null; image: string | null; status: boolean }[];
  rates: {
    id: number;
    shipping_method_id: number;
    shipping_zone_id: number;
    method: string | null;
    zone: string | null;
    amount: number;
    min_order_amount: number;
    max_order_amount: number;
    expected_delivery_days: number;
    is_cod: boolean;
    status: boolean;
  }[];
};

export function ShippingScreen() {
  const [data, setData] = useState<ShippingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoneModal, setZoneModal] = useState(false);
  const [methodModal, setMethodModal] = useState(false);
  const [rateModal, setRateModal] = useState(false);
  const [zoneForm, setZoneForm] = useState({ id: 0, name: '', status: true });
  const [methodForm, setMethodForm] = useState({ id: 0, name: '', description: '', status: true });
  const [rateForm, setRateForm] = useState({
    id: 0,
    shipping_method_id: '',
    shipping_zone_id: '',
    amount: '0',
    min_order_amount: '0',
    max_order_amount: '0',
    expected_delivery_days: '1',
    is_cod: true,
    status: true,
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setData(await api<ShippingPayload>('/admin/shipping', { auth: 'admin' }));
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load shipping');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (path: string, body: Record<string, unknown>, close: () => void) => {
    try {
      const { message } = await apiWithMessage(path, { method: 'POST', auth: 'admin', body });
      toastSuccess(message);
      close();
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not save');
    }
  };

  if (loading) return <div className="vp-skeleton" style={{ height: 300 }} />;

  return (
    <>
      <AdminPageHeader title="Shipping" />

      <div className="row gy-4">
        <div className="col-lg-4">
          <Card
            title="Zones"
            actions={
              <button className="btn btn--sm btn--primary" type="button" onClick={() => { setZoneForm({ id: 0, name: '', status: true }); setZoneModal(true); }}>
                Add
              </button>
            }
          >
            <ul className="list-group list-group-flush">
              {data?.zones.map((zone) => (
                <li className="list-group-item d-flex justify-content-between align-items-center px-0" key={zone.id}>
                  <span>{zone.name}</span>
                  <div className="d-flex gap-2">
                    <StatusBadge active={zone.status} />
                    <button className="btn btn--sm btn-outline--primary" type="button" onClick={() => { setZoneForm({ id: zone.id, name: zone.name, status: zone.status }); setZoneModal(true); }}>
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="col-lg-8">
          <Card
            title="Methods"
            actions={
              <button className="btn btn--sm btn--primary" type="button" onClick={() => { setMethodForm({ id: 0, name: '', description: '', status: true }); setMethodModal(true); }}>
                Add
              </button>
            }
          >
            <ul className="list-group list-group-flush">
              {data?.methods.map((method) => (
                <li className="list-group-item d-flex justify-content-between align-items-center px-0" key={method.id}>
                  <span>
                    <strong>{method.name}</strong>
                    <span className="d-block" style={{ fontSize: 13 }}>
                      {method.description}
                    </span>
                  </span>
                  <div className="d-flex gap-2">
                    <StatusBadge active={method.status} />
                    <button
                      className="btn btn--sm btn-outline--primary"
                      type="button"
                      onClick={() => {
                        setMethodForm({ id: method.id, name: method.name, description: method.description ?? '', status: method.status });
                        setMethodModal(true);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="col-12">
          <Card
            title="Rates"
            actions={
              <button
                className="btn btn--sm btn--primary"
                type="button"
                onClick={() => {
                  setRateForm({
                    id: 0,
                    shipping_method_id: '',
                    shipping_zone_id: '',
                    amount: '0',
                    min_order_amount: '0',
                    max_order_amount: '0',
                    expected_delivery_days: '1',
                    is_cod: true,
                    status: true,
                  });
                  setRateModal(true);
                }}
              >
                Add rate
              </button>
            }
          >
            <DataTable
              rows={data?.rates ?? []}
              rowKey={(row) => row.id}
              empty="No rates configured"
              columns={[
                { key: 'zone', label: 'Zone', render: (row) => row.zone },
                { key: 'method', label: 'Method', render: (row) => row.method },
                { key: 'amount', label: 'Charge', align: 'end', render: (row) => (row.amount > 0 ? showAmount(row.amount) : 'Free') },
                { key: 'days', label: 'Delivery days', align: 'end', render: (row) => row.expected_delivery_days },
                { key: 'cod', label: 'COD', render: (row) => (row.is_cod ? 'Yes' : 'No') },
                { key: 'status', label: 'Status', render: (row) => <StatusBadge active={row.status} /> },
                {
                  key: 'actions',
                  label: 'Action',
                  align: 'end',
                  render: (row) => (
                    <button
                      className="btn btn--sm btn-outline--primary"
                      type="button"
                      onClick={() => {
                        setRateForm({
                          id: row.id,
                          shipping_method_id: String(row.shipping_method_id),
                          shipping_zone_id: String(row.shipping_zone_id),
                          amount: String(row.amount),
                          min_order_amount: String(row.min_order_amount),
                          max_order_amount: String(row.max_order_amount),
                          expected_delivery_days: String(row.expected_delivery_days),
                          is_cod: row.is_cod,
                          status: row.status,
                        });
                        setRateModal(true);
                      }}
                    >
                      Edit
                    </button>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      </div>

      <Modal open={zoneModal} title="Shipping zone" onClose={() => setZoneModal(false)}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(zoneForm.id ? `/admin/shipping/zones/${zoneForm.id}` : '/admin/shipping/zones', zoneForm, () => setZoneModal(false));
          }}
        >
          <Field label="Zone name" required className="col-12">
            <input className="form-control" required value={zoneForm.name} onChange={(event) => setZoneForm((c) => ({ ...c, name: event.target.value }))} />
          </Field>
          <div className="form-check mt-2">
            <input className="form-check-input" type="checkbox" id="zone-status" checked={zoneForm.status} onChange={(event) => setZoneForm((c) => ({ ...c, status: event.target.checked }))} />
            <label className="form-check-label" htmlFor="zone-status">Active</label>
          </div>
          <button className="btn btn--primary mt-3" type="submit">Save zone</button>
        </form>
      </Modal>

      <Modal open={methodModal} title="Shipping method" onClose={() => setMethodModal(false)}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(methodForm.id ? `/admin/shipping/methods/${methodForm.id}` : '/admin/shipping/methods', methodForm, () => setMethodModal(false));
          }}
        >
          <Field label="Method name" required className="col-12">
            <input className="form-control" required value={methodForm.name} onChange={(event) => setMethodForm((c) => ({ ...c, name: event.target.value }))} />
          </Field>
          <Field label="Description" className="col-12">
            <input className="form-control" value={methodForm.description} onChange={(event) => setMethodForm((c) => ({ ...c, description: event.target.value }))} />
          </Field>
          <div className="form-check mt-2">
            <input className="form-check-input" type="checkbox" id="method-status" checked={methodForm.status} onChange={(event) => setMethodForm((c) => ({ ...c, status: event.target.checked }))} />
            <label className="form-check-label" htmlFor="method-status">Active</label>
          </div>
          <button className="btn btn--primary mt-3" type="submit">Save method</button>
        </form>
      </Modal>

      <Modal open={rateModal} title="Shipping rate" onClose={() => setRateModal(false)} size="lg">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(rateForm.id ? `/admin/shipping/rates/${rateForm.id}` : '/admin/shipping/rates', {
              ...rateForm,
              shipping_method_id: Number(rateForm.shipping_method_id),
              shipping_zone_id: Number(rateForm.shipping_zone_id),
              amount: Number(rateForm.amount),
              min_order_amount: Number(rateForm.min_order_amount),
              max_order_amount: Number(rateForm.max_order_amount),
              expected_delivery_days: Number(rateForm.expected_delivery_days),
            }, () => setRateModal(false));
          }}
        >
          <div className="row">
            <Field label="Zone" required>
              <select className="form-select" required value={rateForm.shipping_zone_id} onChange={(event) => setRateForm((c) => ({ ...c, shipping_zone_id: event.target.value }))}>
                <option value="">Choose</option>
                {data?.zones.map((zone) => (
                  <option value={zone.id} key={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Method" required>
              <select className="form-select" required value={rateForm.shipping_method_id} onChange={(event) => setRateForm((c) => ({ ...c, shipping_method_id: event.target.value }))}>
                <option value="">Choose</option>
                {data?.methods.map((method) => (
                  <option value={method.id} key={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Charge (TZS)" required>
              <input className="form-control" type="number" min="0" required value={rateForm.amount} onChange={(event) => setRateForm((c) => ({ ...c, amount: event.target.value }))} />
            </Field>
            <Field label="Delivery days">
              <input className="form-control" type="number" min="0" value={rateForm.expected_delivery_days} onChange={(event) => setRateForm((c) => ({ ...c, expected_delivery_days: event.target.value }))} />
            </Field>
            <Field label="Minimum order (TZS)">
              <input className="form-control" type="number" min="0" value={rateForm.min_order_amount} onChange={(event) => setRateForm((c) => ({ ...c, min_order_amount: event.target.value }))} />
            </Field>
            <Field label="Maximum order (TZS)" hint="0 for no upper limit.">
              <input className="form-control" type="number" min="0" value={rateForm.max_order_amount} onChange={(event) => setRateForm((c) => ({ ...c, max_order_amount: event.target.value }))} />
            </Field>
            <div className="col-12 d-flex gap-4">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="rate-cod" checked={rateForm.is_cod} onChange={(event) => setRateForm((c) => ({ ...c, is_cod: event.target.checked }))} />
                <label className="form-check-label" htmlFor="rate-cod">Allows cash on delivery</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="rate-status" checked={rateForm.status} onChange={(event) => setRateForm((c) => ({ ...c, status: event.target.checked }))} />
                <label className="form-check-label" htmlFor="rate-status">Active</label>
              </div>
            </div>
          </div>
          <button className="btn btn--primary mt-3" type="submit">Save rate</button>
        </form>
      </Modal>
    </>
  );
}

/* ================================= Gateways =============================== */

type Gateway = {
  id: number;
  code: number;
  name: string;
  alias: string;
  image: string | null;
  description: string | null;
  status: boolean;
  is_manual: boolean;
  has_driver: boolean;
  is_configured: boolean;
  required_credentials: string[];
  currencies: { id: number; name: string; currency: string; min_amount: number; max_amount: number; percent_charge: number; fixed_charge: number; rate: number }[];
};

export function GatewaysScreen() {
  const [automatic, setAutomatic] = useState<Gateway[]>([]);
  const [manual, setManual] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ automatic: Gateway[]; manual: Gateway[] }>('/admin/gateways', { auth: 'admin' });
      setAutomatic(data.automatic ?? []);
      setManual(data.manual ?? []);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load gateways');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (gateway: Gateway) => {
    try {
      const { message } = await apiWithMessage(`/admin/gateways/${gateway.id}/status`, { method: 'POST', auth: 'admin' });
      toastSuccess(message);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not change the status');
    }
  };

  const renderGateway = (gateway: Gateway) => (
    <div className="col-lg-6" key={gateway.id}>
      <Card>
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            <h6 className="mb-1">{gateway.name}</h6>
            <p className="mb-2" style={{ fontSize: 13, whiteSpace: 'pre-line' }}>
              {gateway.description}
            </p>
            <div className="d-flex flex-wrap gap-2">
              <StatusBadge active={gateway.status} labels={['Enabled', 'Disabled']} />
              {gateway.is_manual ? (
                <span className="badge badge--info">Manual approval</span>
              ) : gateway.is_configured ? (
                <span className="badge badge--success">Credentials set</span>
              ) : (
                <span className="badge badge--warning">Needs credentials</span>
              )}
            </div>
            {!gateway.is_manual && !gateway.is_configured && gateway.required_credentials.length > 0 && (
              <p className="mt-2 mb-0" style={{ fontSize: 13 }}>
                Set in <code>.env</code>: {gateway.required_credentials.join(', ')}
              </p>
            )}
          </div>
          <button className={`btn btn--sm ${gateway.status ? 'btn-outline--warning' : 'btn-outline--success'}`} type="button" onClick={() => toggle(gateway)}>
            {gateway.status ? 'Disable' : 'Enable'}
          </button>
        </div>

        {gateway.currencies.length > 0 && (
          <ul className="list-group list-group-flush mt-3">
            {gateway.currencies.map((currency) => (
              <li className="list-group-item px-0 d-flex justify-content-between" key={currency.id}>
                <span>{currency.currency}</span>
                <span style={{ fontSize: 13 }}>
                  min {showAmount(currency.min_amount)} · charge {currency.percent_charge}% + {showAmount(currency.fixed_charge)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );

  if (loading) return <div className="vp-skeleton" style={{ height: 300 }} />;

  return (
    <>
      <AdminPageHeader title="Payment gateways" />

      <h6 className="mb-3">Mobile money &amp; bank (manual approval)</h6>
      <div className="row gy-4">{manual.map(renderGateway)}</div>

      <h6 className="mb-3 mt-4">Automatic gateways</h6>
      <div className="row gy-4">{automatic.map(renderGateway)}</div>
    </>
  );
}

/* ================================== Tickets =============================== */

type Ticket = {
  id: number;
  ticket: string;
  name: string | null;
  email: string | null;
  subject: string;
  status: number;
  priority: number;
  last_reply: string | null;
  created_at: string;
};

const TICKET_STATUS: Record<number, string> = { 0: 'Open', 1: 'Answered', 2: 'Customer replied', 3: 'Closed' };

export function TicketsScreen() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [counts, setCounts] = useState<{ pending: number; answered: number; closed: number }>({ pending: 0, answered: 0, closed: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<
    {
      id: number;
      message: string;
      from_admin: boolean;
      admin_name: string | null;
      created_at: string;
      attachments: { id: number; name: string }[];
    }[]
  >([]);
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ tickets: Ticket[]; pagination: PaginationMeta; counts: typeof counts }>(
        `/admin/tickets?page=${page}&status=${status}`,
        { auth: 'admin' },
      );
      setRows(data.tickets ?? []);
      setPagination(data.pagination ?? null);
      setCounts(data.counts);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load tickets');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openTicket = async (ticket: Ticket) => {
    try {
      const data = await api<{ ticket: Ticket; messages: typeof messages }>(`/admin/tickets/${ticket.id}`, { auth: 'admin' });
      setActive(data.ticket);
      setMessages(data.messages ?? []);
      setReply('');
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not open the ticket');
    }
  };

  return (
    <>
      <AdminPageHeader title="Support tickets" />

      <Card>
        <div className="admin-filter-bar">
          {(
            [
              ['open', `Needs reply (${counts.pending})`],
              ['answered', `Answered (${counts.answered})`],
              ['closed', `Closed (${counts.closed})`],
              ['', 'All'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn--sm ${status === key ? 'btn--primary' : 'btn-outline--primary'}`}
              onClick={() => {
                setStatus(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <DataTable
          rows={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          empty="No tickets here"
          columns={[
            { key: 'ticket', label: 'Ticket', render: (row) => <strong>{row.ticket}</strong> },
            { key: 'subject', label: 'Subject', render: (row) => row.subject },
            {
              key: 'from',
              label: 'From',
              render: (row) => (
                <>
                  <span className="d-block">{row.name}</span>
                  <span className="d-block" style={{ fontSize: 13 }}>
                    {row.email}
                  </span>
                </>
              ),
            },
            { key: 'status', label: 'Status', render: (row) => <span className="badge badge--primary">{TICKET_STATUS[row.status]}</span> },
            { key: 'last', label: 'Last reply', render: (row) => formatDate(row.last_reply ?? row.created_at, true) },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (row) => (
                <button className="btn btn--sm btn-outline--primary" type="button" onClick={() => openTicket(row)}>
                  Open
                </button>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={Boolean(active)} title={active ? `${active.ticket} — ${active.subject}` : ''} onClose={() => setActive(null)} size="lg">
        <div style={{ maxHeight: 320, overflowY: 'auto' }} className="mb-3">
          {messages
            .slice()
            .reverse()
            .map((message) => (
              <div
                className="p-3 mb-2"
                key={message.id}
                style={{ borderRadius: 8, background: message.from_admin ? 'rgba(255,122,0,.08)' : 'rgba(0,0,0,.03)' }}
              >
                <div className="d-flex justify-content-between mb-1">
                  <strong>{message.from_admin ? message.admin_name ?? 'VIPURI' : active?.name ?? 'Customer'}</strong>
                  <span style={{ fontSize: 13 }}>{formatDate(message.created_at, true)}</span>
                </div>
                <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
                  {message.message}
                </p>

                {message.attachments?.length > 0 && (
                  <div className="vp-extension__actions">
                    {message.attachments.map((attachment) => (
                      <button
                        key={attachment.id}
                        type="button"
                        className="btn btn-sm btn--primary"
                        onClick={async () => {
                          try {
                            await downloadFile(`/admin/tickets/attachments/${attachment.id}`, attachment.name, 'admin');
                          } catch (error) {
                            toastError(
                              error instanceof ApiError ? error.message : 'That file could not be downloaded',
                            );
                          }
                        }}
                      >
                        <i className="las la-paperclip" /> {attachment.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>

        {active && active.status !== 3 && (
          <form
            onSubmit={async (event) => {
              event.preventDefault();

              try {
                const { message } = await apiWithMessage(`/admin/tickets/${active.id}/reply`, {
                  method: 'POST',
                  auth: 'admin',
                  body: { message: reply },
                });
                toastSuccess(message);
                setReply('');
                await openTicket(active);
                await load();
              } catch (error) {
                toastError(error instanceof ApiError ? error.message : 'Could not send the reply');
              }
            }}
          >
            <textarea className="form-control" rows={4} required placeholder="Reply to the customer…" value={reply} onChange={(event) => setReply(event.target.value)} />
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn--primary" type="submit">
                Send reply
              </button>
              <button
                className="btn btn-outline--warning"
                type="button"
                onClick={async () => {
                  await apiWithMessage(`/admin/tickets/${active.id}/close`, { method: 'POST', auth: 'admin' });
                  setActive(null);
                  await load();
                }}
              >
                Close ticket
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
