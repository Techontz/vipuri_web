'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminProviders';
import { Card, DataTable, Field, Modal, StockPill } from '@/components/admin/ui';
import { ApiError, api, apiWithMessage } from '@/lib/api';
import { formatDate, imageUrl, showAmount } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Pagination as PaginationMeta } from '@/types';

type InventoryRow = {
  id: number;
  branch_id: number;
  branch_name: string | null;
  product_id: number;
  product_name: string | null;
  sku: string | null;
  image: string | null;
  variation_id: number;
  variation_label: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_stock_quantity: number;
  shelf_location: string | null;
  cost_price: number;
  is_low: boolean;
  last_counted_at: string | null;
};

type Summary = {
  items: number;
  total_units: number;
  reserved_units: number;
  low_stock: number;
  out_of_stock: number;
  stock_value: number;
};

/** Branch stock levels with in-place adjustment. */
export function InventoryScreen({ initialBranchId }: { initialBranchId?: string }) {
  const { can, isSuperAdmin, branchId } = useAdmin();

  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string; code: string }[]>([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    branch_id: initialBranchId ?? (isSuperAdmin ? '' : String(branchId ?? '')),
    search: '',
    low_stock: false,
    out_of_stock: false,
  });
  const [loading, setLoading] = useState(true);

  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);
  const [adjustForm, setAdjustForm] = useState({ mode: 'delta', quantity: '0', description: '', min_stock_quantity: '0', shelf_location: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const query = new URLSearchParams({ page: String(page) });
      if (filters.branch_id) query.set('branch_id', filters.branch_id);
      if (filters.search) query.set('search', filters.search);
      if (filters.low_stock) query.set('low_stock', '1');
      if (filters.out_of_stock) query.set('out_of_stock', '1');

      const data = await api<{ inventory: InventoryRow[]; pagination: PaginationMeta; summary: Summary }>(
        `/admin/inventory?${query.toString()}`,
        { auth: 'admin' },
      );

      setRows(data.inventory ?? []);
      setPagination(data.pagination ?? null);
      setSummary(data.summary ?? null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load inventory');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<{ branches: { id: number; name: string; code: string }[] }>('/admin/branches/options', { auth: 'admin' })
      .then((data) => setBranches(data.branches ?? []))
      .catch(() => undefined);
  }, []);

  return (
    <>
      <AdminPageHeader title="Branch inventory">
        <Link href="/admin/inventory/transfers" className="btn btn--sm btn-outline--primary">
          Stock transfers
        </Link>
        <Link href="/admin/inventory/history" className="btn btn--sm btn-outline--primary">
          Movement history
        </Link>
      </AdminPageHeader>

      {summary && (
        <div className="row gy-4 mb-4">
          <div className="col-md-3 col-6">
            <Card>
              <span className="d-block" style={{ fontSize: 13 }}>Tracked lines</span>
              <h4 className="mb-0">{summary.items}</h4>
            </Card>
          </div>
          <div className="col-md-3 col-6">
            <Card>
              <span className="d-block" style={{ fontSize: 13 }}>Units on hand</span>
              <h4 className="mb-0">{summary.total_units}</h4>
            </Card>
          </div>
          <div className="col-md-3 col-6">
            <Card>
              <span className="d-block" style={{ fontSize: 13 }}>Low / out of stock</span>
              <h4 className="mb-0">
                <span className="stock-pill low">{summary.low_stock}</span> <span className="stock-pill out">{summary.out_of_stock}</span>
              </h4>
            </Card>
          </div>
          <div className="col-md-3 col-6">
            <Card>
              <span className="d-block" style={{ fontSize: 13 }}>Stock value (cost)</span>
              <h4 className="mb-0">{showAmount(summary.stock_value)}</h4>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label">Branch</label>
            <select
              className="form-select"
              value={filters.branch_id}
              disabled={!isSuperAdmin}
              onChange={(event) => {
                setFilters((current) => ({ ...current, branch_id: event.target.value }));
                setPage(1);
              }}
            >
              <option value="">All my branches</option>
              {branches.map((branch) => (
                <option value={branch.id} key={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              className="form-control"
              placeholder="Product or SKU"
              value={filters.search}
              onChange={(event) => {
                setFilters((current) => ({ ...current, search: event.target.value }));
                setPage(1);
              }}
            />
          </div>
          <div className="form-group">
            <div className="form-check mt-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="inv-low"
                checked={filters.low_stock}
                onChange={(event) => setFilters((current) => ({ ...current, low_stock: event.target.checked }))}
              />
              <label className="form-check-label" htmlFor="inv-low">
                Low stock
              </label>
            </div>
          </div>
          <div className="form-group">
            <div className="form-check mt-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="inv-out"
                checked={filters.out_of_stock}
                onChange={(event) => setFilters((current) => ({ ...current, out_of_stock: event.target.checked }))}
              />
              <label className="form-check-label" htmlFor="inv-out">
                Out of stock
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
          empty="No stock records yet"
          columns={[
            {
              key: 'product',
              label: 'Product',
              render: (row) => (
                <div className="d-flex align-items-center gap-3">
                  <img src={imageUrl(row.image)} alt={row.product_name ?? ''} width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover' }} />
                  <div>
                    <strong>{row.product_name}</strong>
                    <span className="d-block" style={{ fontSize: 13 }}>
                      {row.sku ?? '—'}
                      {row.variation_label ? ` · ${row.variation_label}` : ''}
                    </span>
                  </div>
                </div>
              ),
            },
            { key: 'branch', label: 'Branch', render: (row) => row.branch_name },
            { key: 'stock', label: 'On hand', align: 'end', render: (row) => <StockPill quantity={row.stock_quantity} minimum={row.min_stock_quantity} /> },
            { key: 'reserved', label: 'Reserved', align: 'end', render: (row) => row.reserved_quantity },
            { key: 'available', label: 'Available', align: 'end', render: (row) => row.available_quantity },
            { key: 'shelf', label: 'Shelf', render: (row) => row.shelf_location ?? '—' },
            { key: 'counted', label: 'Last count', render: (row) => (row.last_counted_at ? formatDate(row.last_counted_at) : '—') },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (row) =>
                can('inventory.adjust') && (
                  <button
                    className="btn btn--sm btn-outline--primary"
                    type="button"
                    onClick={() => {
                      setAdjusting(row);
                      setAdjustForm({
                        mode: 'delta',
                        quantity: '0',
                        description: '',
                        min_stock_quantity: String(row.min_stock_quantity),
                        shelf_location: row.shelf_location ?? '',
                      });
                    }}
                  >
                    Adjust
                  </button>
                ),
            },
          ]}
        />
      </Card>

      <Modal open={Boolean(adjusting)} title={`Adjust ${adjusting?.product_name ?? ''}`} onClose={() => setAdjusting(null)}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!adjusting) return;

            setBusy(true);

            try {
              const { message } = await apiWithMessage('/admin/inventory/adjust', {
                method: 'POST',
                auth: 'admin',
                body: {
                  branch_id: adjusting.branch_id,
                  product_id: adjusting.product_id,
                  variation_id: adjusting.variation_id,
                  mode: adjustForm.mode,
                  quantity: Number(adjustForm.quantity),
                  description: adjustForm.description,
                  min_stock_quantity: Number(adjustForm.min_stock_quantity),
                  shelf_location: adjustForm.shelf_location,
                },
              });

              toastSuccess(message);
              setAdjusting(null);
              await load();
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : 'Could not adjust stock');
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            Current stock at {adjusting?.branch_name}: <strong>{adjusting?.stock_quantity}</strong>
          </p>

          <div className="row">
            <Field label="Mode">
              <select className="form-select" value={adjustForm.mode} onChange={(event) => setAdjustForm((c) => ({ ...c, mode: event.target.value }))}>
                <option value="delta">Add / remove</option>
                <option value="absolute">Set exact count</option>
              </select>
            </Field>
            <Field label={adjustForm.mode === 'delta' ? 'Change (+/-)' : 'New count'} required>
              <input className="form-control" type="number" required value={adjustForm.quantity} onChange={(event) => setAdjustForm((c) => ({ ...c, quantity: event.target.value }))} />
            </Field>
            <Field label="Low-stock threshold">
              <input className="form-control" type="number" min="0" value={adjustForm.min_stock_quantity} onChange={(event) => setAdjustForm((c) => ({ ...c, min_stock_quantity: event.target.value }))} />
            </Field>
            <Field label="Shelf location">
              <input className="form-control" value={adjustForm.shelf_location} onChange={(event) => setAdjustForm((c) => ({ ...c, shelf_location: event.target.value }))} />
            </Field>
            <Field label="Reason" className="col-12">
              <input className="form-control" placeholder="Stock count, damage, restock…" value={adjustForm.description} onChange={(event) => setAdjustForm((c) => ({ ...c, description: event.target.value }))} />
            </Field>
          </div>

          <div className="d-flex gap-2 mt-3">
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Apply adjustment'}
            </button>
            <button className="btn btn-outline--primary" type="button" onClick={() => setAdjusting(null)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ============================== Stock transfers =========================== */

type TransferItem = {
  id: number;
  product_id: number;
  product_name: string | null;
  sku: string | null;
  variation_id: number;
  quantity: number;
  received_quantity: number;
};

type Transfer = {
  id: number;
  reference: string;
  from_branch: string | null;
  from_branch_id: number;
  to_branch: string | null;
  to_branch_id: number;
  status: number;
  status_label: string;
  requested_by: string | null;
  note: string | null;
  items: TransferItem[];
  dispatched_at: string | null;
  received_at: string | null;
  created_at: string;
};

export function StockTransfersScreen() {
  const { can, isSuperAdmin, branchId } = useAdmin();

  const [rows, setRows] = useState<Transfer[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<{ id: number; name: string; code: string }[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{
    from_branch_id: string;
    to_branch_id: string;
    note: string;
    items: { product_id: string; variation_id: string; quantity: string; label: string }[];
  }>({ from_branch_id: '', to_branch_id: '', note: '', items: [] });
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<{ id: number; name: string; sku: string | null; variations: { id: number; label: string }[] }[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ transfers: Transfer[]; pagination: PaginationMeta }>(
        `/admin/inventory/transfers?page=${page}${status !== '' ? `&status=${status}` : ''}`,
        { auth: 'admin' },
      );
      setRows(data.transfers ?? []);
      setPagination(data.pagination ?? null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load transfers');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<{ branches: { id: number; name: string; code: string }[] }>('/admin/branches/options', { auth: 'admin' })
      .then((data) => setBranches(data.branches ?? []))
      .catch(() => undefined);
  }, []);

  const act = async (path: string, body?: Record<string, unknown>) => {
    try {
      const { message } = await apiWithMessage(path, { method: 'POST', auth: 'admin', body });
      toastSuccess(message);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Action failed');
    }
  };

  const searchProducts = async () => {
    if (!form.from_branch_id) {
      toastError('Choose the source branch first');
      return;
    }

    try {
      const data = await api<{ products: { id: number; name: string; sku: string | null; variations: { id: number; label: string }[] }[] }>(
        `/admin/inventory/assignable-products?branch_id=${form.from_branch_id}&search=${encodeURIComponent(productSearch)}`,
        { auth: 'admin' },
      );
      setProductResults(data.products ?? []);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not search products');
    }
  };

  return (
    <>
      <AdminPageHeader title="Stock transfers">
        {can('inventory.transfer') && (
          <button
            className="btn btn--primary btn--sm"
            type="button"
            onClick={() => {
              setForm({ from_branch_id: isSuperAdmin ? '' : String(branchId ?? ''), to_branch_id: '', note: '', items: [] });
              setProductResults([]);
              setModalOpen(true);
            }}
          >
            <i className="las la-plus" /> New transfer
          </button>
        )}
      </AdminPageHeader>

      <Card>
        <div className="admin-filter-bar">
          {(
            [
              ['', 'All'],
              ['0', 'Pending'],
              ['1', 'In transit'],
              ['2', 'Received'],
              ['3', 'Cancelled'],
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
          empty="No transfers yet"
          columns={[
            { key: 'ref', label: 'Reference', render: (row) => <strong>{row.reference}</strong> },
            { key: 'route', label: 'Route', render: (row) => `${row.from_branch} → ${row.to_branch}` },
            {
              key: 'items',
              label: 'Items',
              render: (row) => (
                <ul className="mb-0 ps-3">
                  {row.items.map((item) => (
                    <li key={item.id}>
                      {item.product_name} × {item.quantity}
                      {row.status === 2 && item.received_quantity !== item.quantity ? ` (received ${item.received_quantity})` : ''}
                    </li>
                  ))}
                </ul>
              ),
            },
            { key: 'status', label: 'Status', render: (row) => <span className="badge badge--primary">{row.status_label}</span> },
            { key: 'created', label: 'Created', render: (row) => formatDate(row.created_at) },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (row) => (
                <div className="d-flex gap-2 justify-content-end flex-wrap">
                  {row.status === 0 && can('inventory.transfer') && (
                    <>
                      <button className="btn btn--sm btn-outline--success" type="button" onClick={() => act(`/admin/inventory/transfers/${row.id}/dispatch`)}>
                        Dispatch
                      </button>
                      <button className="btn btn--sm btn-outline--danger" type="button" onClick={() => act(`/admin/inventory/transfers/${row.id}/cancel`)}>
                        Cancel
                      </button>
                    </>
                  )}
                  {row.status === 1 && can('inventory.transfer') && (
                    <button className="btn btn--sm btn-outline--success" type="button" onClick={() => act(`/admin/inventory/transfers/${row.id}/receive`)}>
                      Mark received
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} title="New stock transfer" onClose={() => setModalOpen(false)} size="lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault();

            if (form.items.length === 0) {
              toastError('Add at least one item');
              return;
            }

            setBusy(true);

            try {
              const { message } = await apiWithMessage('/admin/inventory/transfers', {
                method: 'POST',
                auth: 'admin',
                body: {
                  from_branch_id: Number(form.from_branch_id),
                  to_branch_id: Number(form.to_branch_id),
                  note: form.note,
                  items: form.items.map((item) => ({
                    product_id: Number(item.product_id),
                    variation_id: Number(item.variation_id || 0),
                    quantity: Number(item.quantity),
                  })),
                },
              });

              toastSuccess(message);
              setModalOpen(false);
              await load();
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : 'Could not create the transfer');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="row">
            <Field label="From branch" required>
              <select className="form-select" required value={form.from_branch_id} disabled={!isSuperAdmin} onChange={(event) => setForm((c) => ({ ...c, from_branch_id: event.target.value }))}>
                <option value="">Choose</option>
                {branches.map((branch) => (
                  <option value={branch.id} key={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="To branch" required>
              <select className="form-select" required value={form.to_branch_id} onChange={(event) => setForm((c) => ({ ...c, to_branch_id: event.target.value }))}>
                <option value="">Choose</option>
                {branches
                  .filter((branch) => String(branch.id) !== form.from_branch_id)
                  .map((branch) => (
                    <option value={branch.id} key={branch.id}>
                      {branch.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Note" className="col-12">
              <input className="form-control" value={form.note} onChange={(event) => setForm((c) => ({ ...c, note: event.target.value }))} />
            </Field>
          </div>

          <h6 className="mt-3">Items</h6>

          <div className="d-flex gap-2 mb-3">
            <input className="form-control" placeholder="Search products" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
            <button className="btn btn-outline--primary" type="button" onClick={searchProducts}>
              Search
            </button>
          </div>

          {productResults.length > 0 && (
            <ul className="list-group mb-3" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {productResults.map((product) => (
                <li className="list-group-item d-flex justify-content-between align-items-center" key={product.id}>
                  <span>
                    {product.name} <span style={{ fontSize: 13 }}>{product.sku}</span>
                  </span>
                  <button
                    className="btn btn--sm btn-outline--primary"
                    type="button"
                    onClick={() =>
                      setForm((c) => ({
                        ...c,
                        items: [...c.items, { product_id: String(product.id), variation_id: '0', quantity: '1', label: product.name }],
                      }))
                    }
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}

          {form.items.map((item, index) => (
            <div className="row align-items-end mb-2" key={index}>
              <div className="col-md-7">
                <input className="form-control" value={item.label} readOnly />
              </div>
              <div className="col-md-3">
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) =>
                    setForm((c) => {
                      const next = [...c.items];
                      next[index] = { ...next[index], quantity: event.target.value };
                      return { ...c, items: next };
                    })
                  }
                />
              </div>
              <div className="col-md-2">
                <button className="btn btn--sm btn-outline--danger" type="button" onClick={() => setForm((c) => ({ ...c, items: c.items.filter((_, i) => i !== index) }))}>
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="d-flex gap-2 mt-4">
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create transfer'}
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

/* ============================== Stock history ============================= */

type StockLogRow = {
  id: number;
  branch: string | null;
  product: string | null;
  sku: string | null;
  variation_id: number;
  order_number: string | null;
  change_quantity: number;
  post_quantity: number;
  remark: string | null;
  description: string | null;
  actor_name: string | null;
  created_at: string;
};

export function StockHistoryScreen() {
  const [rows, setRows] = useState<StockLogRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    api<{ logs: StockLogRow[]; pagination: PaginationMeta }>(`/admin/inventory/history?page=${page}`, { auth: 'admin' })
      .then((data) => {
        setRows(data.logs ?? []);
        setPagination(data.pagination ?? null);
      })
      .catch((error) => toastError(error instanceof ApiError ? error.message : 'Could not load history'))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <>
      <AdminPageHeader title="Inventory movement history" />

      <Card>
        <DataTable
          rows={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          empty="No stock movements recorded"
          columns={[
            { key: 'date', label: 'When', render: (row) => formatDate(row.created_at, true) },
            { key: 'branch', label: 'Branch', render: (row) => row.branch ?? '—' },
            {
              key: 'product',
              label: 'Product',
              render: (row) => (
                <>
                  <strong>{row.product}</strong>
                  <span className="d-block" style={{ fontSize: 13 }}>
                    {row.sku ?? ''}
                  </span>
                </>
              ),
            },
            {
              key: 'change',
              label: 'Change',
              align: 'end',
              render: (row) => (
                <strong className={row.change_quantity < 0 ? 'text--danger' : 'text--success'}>
                  {row.change_quantity > 0 ? '+' : ''}
                  {row.change_quantity}
                </strong>
              ),
            },
            { key: 'post', label: 'After', align: 'end', render: (row) => row.post_quantity },
            { key: 'reason', label: 'Reason', render: (row) => row.description ?? row.remark ?? '—' },
            { key: 'order', label: 'Order', render: (row) => row.order_number ?? '—' },
            { key: 'actor', label: 'By', render: (row) => row.actor_name ?? 'System' },
          ]}
        />
      </Card>
    </>
  );
}
