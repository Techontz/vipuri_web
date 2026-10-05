'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AdminPageHeader, AdminWidget } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminProviders';
import { Card, DataTable, Field, Modal, StatusBadge , OrderStatusBadge } from '@/components/admin/ui';
import { API_URL, ApiError, ADMIN_TOKEN_KEY, api, apiWithMessage, readToken } from '@/lib/api';
import { formatDate, imageUrl, showAmount } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Customer, Order, Pagination as PaginationMeta } from '@/types';

const ORDER_STATUS: { value: number; label: string }[] = [
  { value: 0, label: 'Pending' },
  { value: 1, label: 'Paid' },
  { value: 2, label: 'Processing' },
  { value: 3, label: 'Dispatched' },
  { value: 4, label: 'Delivered' },
  { value: 6, label: 'Returned' },
  { value: 7, label: 'Cancelled' },
];

/* ------------------------- Who may set which status ------------------------
   These mirror the rules the API already enforces; they are not a second set
   of rules. The server remains the authority — everything here only decides
   which controls are worth showing, so a worker is never handed a button that
   will come back 403.

   `config('vipuri.order.worker_allowed_statuses')` keys its restriction off
   the *role name*, so this does too rather than guessing from permissions.  */

const WORKER_ROLE = 'Branch Worker';
const WORKER_STATUSES = [2, 3, 4];

/** The status's own name — not the wording of the button that reaches it. */
function statusLabel(status: number): string {
  return ORDER_STATUS.find((entry) => entry.value === status)?.label ?? String(status);
}

/** The permission a status needs beyond `order.update_status`, if any. */
function statusPermission(status: number): string | null {
  if (status === 7) return 'order.cancel';
  if (status === 6) return 'order.return';
  return null;
}

/**
 * The step this order is most likely waiting for.
 *
 * Presentation only — it promotes one of the statuses the caller is already
 * allowed to set, so it can be ignored entirely. Nothing here prevents any
 * other transition, and the API is free to disagree.
 */
const NEXT_STEP: Record<number, { status: number; label: string }> = {
  0: { status: 2, label: 'Process order' },
  1: { status: 2, label: 'Process order' },
  2: { status: 3, label: 'Mark dispatched' },
  3: { status: 4, label: 'Mark delivered' },
};

/* ================================== Orders ================================ */

export function OrdersScreen({ initialStatus, initialBranchId }: { initialStatus?: string; initialBranchId?: string }) {
  const { isSuperAdmin } = useAdmin();

  const [orders, setOrders] = useState<Order[]>([]);
  const [widgets, setWidgets] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: initialStatus ?? '',
    branch_id: initialBranchId ?? '',
    search: '',
    from: '',
    to: '',
  });
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* Any filter change starts again at page 1. Without this, narrowing the list
     while on page 3 leaves you looking at an empty table and no explanation. */
  const applyFilter = useCallback((patch: Partial<typeof filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }, []);

  /* How many of the folded-away filters are actually doing something — the
     badge on the toggle, so a narrowed list is never silently narrowed. */
  const activeFilters = [filters.status, filters.branch_id, filters.from, filters.to].filter(Boolean).length;

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const query = new URLSearchParams({ page: String(page) });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });

      const data = await api<{ orders: Order[]; pagination: PaginationMeta; widgets: Record<string, number> }>(
        `/admin/orders?${query.toString()}`,
        { auth: 'admin' },
      );

      setOrders(data.orders ?? []);
      setPagination(data.pagination ?? null);
      setWidgets(data.widgets ?? {});
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load orders');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    api<{ branches: { id: number; name: string }[] }>('/admin/branches/options', { auth: 'admin' })
      .then((data) => setBranches(data.branches ?? []))
      .catch(() => undefined);
  }, [isSuperAdmin]);

  return (
    <>
      <AdminPageHeader title="Orders" />

      {/* 2×2 on a phone rather than four full-width tiles, so the list itself
          is still above the fold. Same treatment as the dashboard. */}
      <div className="row gy-4 mb-4 vp-priority-metrics">
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="All orders" value={widgets.order_total ?? 0} icon="las la-shopping-cart" bg="primary" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Pending" value={widgets.order_pending ?? 0} icon="las la-hourglass-half" bg="warning" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Delivered" value={widgets.order_delivered ?? 0} icon="las la-check-circle" bg="success" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Cash on delivery" value={widgets.order_cod ?? 0} icon="las la-money-bill" bg="info" />
        </div>
      </div>

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              className="form-control"
              placeholder="Order number or customer"
              value={filters.search}
              onChange={(event) => applyFilter({ search: event.target.value })}
            />
          </div>
          <button
            type="button"
            className="btn btn-outline--primary vp-filter-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <i className="las la-filter" /> {filtersOpen ? 'Hide filters' : 'Filters'}
            {activeFilters > 0 && <span className="badge badge--primary ms-1">{activeFilters}</span>}
          </button>

          <div className={`vp-filter-extra ${filtersOpen ? 'is-open' : ''}`}>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={filters.status} onChange={(event) => applyFilter({ status: event.target.value })}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
              <option value="cancelled">Cancelled</option>
              <option value="cod">Cash on delivery</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          {isSuperAdmin && (
            <div className="form-group">
              <label className="form-label">Branch</label>
              <select className="form-select" value={filters.branch_id} onChange={(event) => applyFilter({ branch_id: event.target.value })}>
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option value={branch.id} key={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">From</label>
            <input className="form-control" type="date" value={filters.from} onChange={(event) => applyFilter({ from: event.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <input className="form-control" type="date" value={filters.to} onChange={(event) => applyFilter({ to: event.target.value })} />
          </div>
          </div>
        </div>

        <DataTable
          rows={orders}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(order) => order.id}
          empty="No orders found"
          columns={[
            {
              /* Number and date together: the date is what tells a worker how
                 long an order has been waiting, and pairing them here buys the
                 column the list needs to fit a laptop without a sideways
                 scroll — measured at 1280px, not guessed. */
              key: 'number',
              label: 'Order',
              nowrap: true,
              render: (order) => (
                <>
                  <Link href={`/admin/orders/${order.id}`}>
                    <strong>{order.order_number}</strong>
                  </Link>
                  <span className="d-block text-muted" style={{ fontSize: 13 }}>
                    {formatDate(order.created_at)}
                  </span>
                </>
              ),
            },
            {
              key: 'customer',
              label: 'Customer',
              render: (order) => (
                <>
                  <span className="d-block">{order.customer?.name ?? order.guest?.name ?? 'Guest'}</span>
                  <span className="d-block" style={{ fontSize: 13 }}>
                    {order.customer?.email ?? order.guest?.email ?? ''}
                  </span>
                </>
              ),
            },
            /* Branch staff only ever see their own branch, so the column is
               dead weight for them — and columns are what costs width. */
            ...(isSuperAdmin
              ? [{ key: 'branch', label: 'Branch', render: (order: Order) => order.branch?.name ?? '—' }]
              : []),
            { key: 'status', label: 'Status', nowrap: true, render: (order) => <OrderStatusBadge status={order.status} label={order.status_label} /> },
            {
              key: 'payment',
              label: 'Payment',
              nowrap: true,
              render: (order) => (
                <span className={`badge badge--${order.payment_status === 1 ? 'success' : 'warning'}`}>
                  {order.payment_status_label}
                </span>
              ),
            },
            { key: 'total', label: 'Total', align: 'end', nowrap: true, render: (order) => <strong>{showAmount(order.total)}</strong> },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              nowrap: true,
              render: (order) => (
                <Link href={`/admin/orders/${order.id}`} className="btn btn--sm btn-outline--primary">
                  Manage
                </Link>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}

/* ------------------------------ Order detail ------------------------------ */

/** What the confirmation dialog is about to do. */
type PendingAction =
  | { kind: 'status'; status: number; label: string }
  | { kind: 'paid' };

export function OrderDetailScreen({ id }: { id: number }) {
  const { admin, can, isSuperAdmin } = useAdmin();

  const [order, setOrder] = useState<Order | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [remark, setRemark] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  /* State updates are batched, so `busy` is still false on a second click in
     the same tick. The ref is what actually stops a double submission. */
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ order: Order; branches: { id: number; name: string; code: string }[] }>(
        `/admin/orders/${id}`,
        { auth: 'admin' },
      );
      setOrder(data.order);
      setBranches(data.branches ?? []);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load the order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Run the pending action, then reload before saying anything succeeded.
   *
   * Nothing is applied to the on-screen order optimistically: if the API
   * refuses — a worker reaching for Cancelled, an order already closed — the
   * dialog stays open carrying the reason the server gave, verbatim.
   */
  const runPendingAction = useCallback(async () => {
    if (!order || !pending || inFlight.current) return;

    inFlight.current = true;
    setBusy(true);
    setActionError(null);

    try {
      const { message } =
        pending.kind === 'paid'
          ? await apiWithMessage(`/admin/orders/${order.id}/mark-paid`, { method: 'POST', auth: 'admin' })
          : await apiWithMessage(`/admin/orders/${order.id}/status`, {
              method: 'POST',
              auth: 'admin',
              body: { status: pending.status, remark: remark.trim() || null },
            });

      await load();

      toastSuccess(message);
      setPending(null);
      setRemark('');
    } catch (error) {
      const reason =
        error instanceof ApiError
          ? error.message
          : 'That action could not be completed. Please try again.';

      setActionError(reason);
      toastError(reason);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [order, pending, remark, load]);

  const closeDialog = useCallback(() => {
    if (inFlight.current) return;
    setPending(null);
    setRemark('');
    setActionError(null);
  }, []);

  if (loading) return <div className="vp-skeleton" style={{ height: 300 }} />;
  if (!order) return <Card>Order not found.</Card>;

  const address = order.shipping_address ?? {};

  const isWorker = admin?.role === WORKER_ROLE && !isSuperAdmin;
  const mayUpdateStatus = can('order.update_status');

  const settableStatuses = ORDER_STATUS.filter((status) => {
    if (status.value === order.status) return false;
    if (isWorker && !WORKER_STATUSES.includes(status.value)) return false;

    const permission = statusPermission(status.value);
    return permission ? can(permission) : true;
  });

  const suggested = NEXT_STEP[order.status];
  const primary =
    mayUpdateStatus && suggested && settableStatuses.some((s) => s.value === suggested.status)
      ? suggested
      : null;

  const secondary = settableStatuses.filter((status) => status.value !== primary?.status);

  const askStatus = (status: number, label: string) => {
    setActionError(null);
    setRemark('');
    setPending({ kind: 'status', status, label });
  };

  const downloadInvoice = async () => {
    const token = readToken(ADMIN_TOKEN_KEY);

    try {
      const response = await fetch(`${API_URL}/admin/orders/${order.id}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Could not generate the invoice');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.order_number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Could not generate the invoice');
    }
  };

  return (
    <>
      <AdminPageHeader title={`Order ${order.order_number}`}>
        {can('order.invoice') && (
          <button className="btn btn--sm btn-outline--primary" type="button" onClick={downloadInvoice}>
            <i className="las la-file-pdf" /> Invoice
          </button>
        )}
        <Link href="/admin/orders" className="btn btn--sm btn-outline--primary">
          Back to orders
        </Link>
      </AdminPageHeader>

      {/* Where the order stands, before anything else on the page. */}
      <div className="vp-order-state">
        <OrderStatusBadge status={order.status} label={order.status_label} />
        <span className={`badge badge--${order.payment_status === 1 ? 'success' : 'warning'}`}>
          {order.payment_status_label}
        </span>
        {order.cod && <span className="badge badge--dark">Cash on delivery</span>}
        <span className="vp-order-state__meta">
          {order.branch?.name ? `${order.branch.name} · ` : ''}
          {formatDate(order.created_at, true)}
        </span>
      </div>

      {/*
        One grid, ordered for a worker holding a phone: who the order is for,
        what is in it, what has been paid, who last touched it, then what to do
        about it. Desktop rearranges the same markup into two columns through
        `grid-template-areas` — no card is rendered twice.
      */}
      <div className="vp-order-layout">
        <Card title="Customer" className="vp-order-area--customer">
          <p className="mb-1">
            <strong>{order.customer?.name ?? order.guest?.name ?? 'Guest'}</strong>
            {!order.customer && <span className="badge badge--dark ms-2">Guest</span>}
          </p>
          <p className="mb-1">{order.customer?.email ?? order.guest?.email ?? '—'}</p>
          <p className="mb-3">{order.customer?.mobile ?? order.guest?.mobile ?? '—'}</p>

          <h6 className="vp-order-subhead">Delivery address</h6>
          <p className="mb-0">
            {address.address}
            <br />
            {[address.city, address.state].filter(Boolean).join(', ')}
            <br />
            {address.country_name ?? 'Tanzania'}
          </p>

          {order.note && (
            <>
              <h6 className="vp-order-subhead mt-3">Order note</h6>
              <p className="mb-0">{order.note}</p>
            </>
          )}
        </Card>

        <Card title={`Items (${(order.items ?? []).length})`} className="vp-order-area--items">
          <div className="table-responsive">
            <table className="table table--light style--two vp-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">Tax</th>
                  <th className="text-end">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(order.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td data-label="Product">
                      <div className="d-flex align-items-center gap-3">
                        <img src={imageUrl(item.image)} alt={item.product_name ?? ''} width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover', flex: '0 0 40px' }} />
                        <div>
                          <strong>{item.product_name}</strong>
                          <span className="d-block" style={{ fontSize: 13 }}>
                            {item.sku ?? ''}
                            {item.variation_label ? ` · ${item.variation_label}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Qty" className="text-end">{item.quantity}</td>
                    <td data-label="Price" className="text-end">{showAmount(item.price)}</td>
                    <td data-label="Tax" className="text-end">{showAmount(item.total_tax)}</td>
                    <td data-label="Subtotal" className="text-end">{showAmount(item.subtotal)}</td>
                  </tr>
                ))}
                {(order.items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      This order has no line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Payment" className="vp-order-area--payment">
          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex justify-content-between px-0">
              <span>Subtotal</span> <strong>{showAmount(order.subtotal)}</strong>
            </li>
            <li className="list-group-item d-flex justify-content-between px-0">
              <span>Tax</span> <strong>{showAmount(order.total_tax)}</strong>
            </li>
            <li className="list-group-item d-flex justify-content-between px-0">
              <span>Delivery</span> <strong>{showAmount(order.shipping_charge)}</strong>
            </li>
            <li className="list-group-item d-flex justify-content-between px-0">
              <span>Discount</span> <strong>- {showAmount(order.discount)}</strong>
            </li>
            <li className="list-group-item d-flex justify-content-between px-0 vp-order-total">
              <span>Total</span> <strong>{showAmount(order.total)}</strong>
            </li>
          </ul>

          <p className="vp-order-payment-state">
            <span>Payment status</span>
            <span className={`badge badge--${order.payment_status === 1 ? 'success' : 'warning'}`}>
              {order.payment_status_label}
            </span>
          </p>

          {/* Payment is its own decision — never bundled into a status change. */}
          {mayUpdateStatus && order.payment_status !== 1 && (
            <button
              className="btn btn--success vp-order-action"
              type="button"
              disabled={busy}
              onClick={() => {
                setActionError(null);
                setRemark('');
                setPending({ kind: 'paid' });
              }}
            >
              <i className="las la-money-bill-wave" /> Mark as paid
            </button>
          )}
        </Card>

        <Card title="Processing" className="vp-order-area--processing">
          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex justify-content-between gap-3 px-0">
              <span>Branch</span> <strong>{order.branch?.name ?? '—'}</strong>
            </li>
            <li className="list-group-item d-flex justify-content-between gap-3 px-0">
              <span>Placed</span> <strong>{formatDate(order.created_at, true)}</strong>
            </li>
            <li className="list-group-item d-flex justify-content-between gap-3 px-0">
              <span>Dispatched</span> <strong>{order.dispatched_at ? formatDate(order.dispatched_at, true) : '—'}</strong>
            </li>
            <li className="list-group-item d-flex justify-content-between gap-3 px-0">
              <span>Delivered</span> <strong>{order.delivered_at ? formatDate(order.delivered_at, true) : '—'}</strong>
            </li>
            {/*
              `processed_by` records the staff member who acted on the order
              most recently — it is not an assignment and not an owner, so it
              is labelled for exactly what it is.
            */}
            <li className="list-group-item d-flex justify-content-between gap-3 px-0">
              <span>Last processed by</span>{' '}
              <strong>{order.processed_by ?? 'Not processed yet'}</strong>
            </li>
          </ul>

          {isSuperAdmin && branches.length > 0 && (
            <div className="mt-3">
              <label className="form-label" htmlFor="vp-order-branch">
                Fulfilling branch
              </label>
              <select
                id="vp-order-branch"
                className="form-select"
                value={order.branch?.id ?? ''}
                disabled={busy}
                onChange={async (event) => {
                  try {
                    const { message } = await apiWithMessage(`/admin/orders/${order.id}/branch`, {
                      method: 'POST',
                      auth: 'admin',
                      body: { branch_id: Number(event.target.value) },
                    });
                    await load();
                    toastSuccess(message);
                  } catch (error) {
                    toastError(error instanceof ApiError ? error.message : 'Could not reassign the order');
                  }
                }}
              >
                {branches.map((branch) => (
                  <option value={branch.id} key={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </Card>

        <Card title="Actions" className="vp-order-area--actions">
          {!mayUpdateStatus ? (
            <p className="mb-0 text-muted">You do not have permission to change this order.</p>
          ) : settableStatuses.length === 0 ? (
            <p className="mb-0 text-muted">
              This order is {order.status_label.toLowerCase()}. There is nothing left for you to change.
            </p>
          ) : (
            <>
              {primary && (
                <button
                  className="btn btn--primary vp-order-action vp-order-action--primary"
                  type="button"
                  disabled={busy}
                  onClick={() => askStatus(primary.status, primary.label)}
                >
                  {primary.label}
                </button>
              )}

              {secondary.length > 0 && (
                <div className="vp-order-secondary">
                  <span className="vp-order-secondary__label">
                    {primary ? 'Or change the status to' : 'Change status to'}
                  </span>
                  <div className="vp-order-secondary__buttons">
                    {secondary.map((status) => (
                      <button
                        key={status.value}
                        className={`btn vp-order-action ${status.value === 7 ? 'btn-outline--danger' : 'btn-outline--primary'}`}
                        type="button"
                        disabled={busy}
                        onClick={() => askStatus(status.value, status.label)}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isWorker && (
                <p className="vp-order-hint">
                  Cancellations and returns are handled by a manager.
                </p>
              )}
            </>
          )}
        </Card>

        {(order.deposits ?? []).length > 0 && (
          <Card title="Payments received" className="vp-order-area--deposits">
            <div className="table-responsive">
              <table className="table table--light style--two vp-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.deposits ?? []).map((deposit) => (
                    <tr key={deposit.id}>
                      <td data-label="Reference">{deposit.trx}</td>
                      <td data-label="Method">{deposit.method ?? '—'}</td>
                      <td data-label="Date">{formatDate(deposit.created_at)}</td>
                      <td data-label="Amount" className="text-end">{showAmount(deposit.final_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {(order.status_logs ?? []).length > 0 && (
          <Card title="History" className="vp-order-area--history">
            <ul className="list-group list-group-flush">
              {(order.status_logs ?? []).map((log) => (
                <li className="list-group-item px-0 vp-order-history-item" key={log.id}>
                  <span>
                    <strong>{log.to_status_label}</strong>
                    {log.remark ? ` — ${log.remark}` : ''}
                    <span className="d-block" style={{ fontSize: 13 }}>
                      by {log.actor_name ?? 'System'}
                    </span>
                  </span>
                  <time className="vp-order-history-item__at">{formatDate(log.created_at, true)}</time>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <Modal
        open={pending !== null}
        title={pending?.kind === 'paid' ? 'Mark this order as paid' : 'Confirm status change'}
        onClose={closeDialog}
      >
        {pending && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void runPendingAction();
            }}
          >
            <p className="mb-2">
              Order <strong>{order.order_number}</strong>
              {order.customer?.name || order.guest?.name ? (
                <> for {order.customer?.name ?? order.guest?.name}</>
              ) : null}
            </p>

            {pending.kind === 'paid' ? (
              <p className="mb-3">
                This records <strong>{showAmount(order.total)}</strong> as received. It changes the
                payment status only — the order stays {order.status_label.toLowerCase()}.
              </p>
            ) : (
              <>
                {/* The status's own name, not the button's wording — the
                    button says "Process order", the order becomes Processing. */}
                <p className="mb-3 vp-order-transition">
                  <OrderStatusBadge status={order.status} label={order.status_label} />
                  <i className="las la-long-arrow-alt-right" aria-hidden="true" />
                  <OrderStatusBadge status={pending.status} label={statusLabel(pending.status)} />
                </p>

                <Field
                  label="Remark"
                  className="col-12"
                  hint={
                    pending.status === 7
                      ? 'Optional. Saved as the cancellation reason and shown in the order history.'
                      : 'Optional. Saved with this change in the order history.'
                  }
                >
                  <textarea
                    className="form-control"
                    rows={3}
                    maxLength={255}
                    value={remark}
                    disabled={busy}
                    onChange={(event) => setRemark(event.target.value)}
                    placeholder="Anything the next person should know"
                  />
                </Field>
              </>
            )}

            {actionError && (
              <div className="vp-order-error" role="alert">
                {actionError}
              </div>
            )}

            <div className="vp-order-dialog-actions">
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? 'Working…' : pending.kind === 'paid' ? 'Mark as paid' : `Confirm — ${pending.label}`}
              </button>
              <button className="btn btn-outline--primary" type="button" onClick={closeDialog} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

/* ================================= Customers ============================== */

export function CustomersScreen() {
  const { can } = useAdmin();

  const [rows, setRows] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [segments, setSegments] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [segment, setSegment] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ customers: Customer[]; pagination: PaginationMeta; segments: Record<string, number> }>(
        `/admin/customers?page=${page}&segment=${segment}&search=${encodeURIComponent(search)}`,
        { auth: 'admin' },
      );
      setRows(data.customers ?? []);
      setPagination(data.pagination ?? null);
      setSegments(data.segments ?? {});
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load customers');
    } finally {
      setLoading(false);
    }
  }, [page, segment, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminPageHeader title="Customers" />

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              className="form-control"
              placeholder="Name, e-mail or mobile"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Segment</label>
            <select className="form-select" value={segment} onChange={(event) => { setSegment(event.target.value); setPage(1); }}>
              <option value="">All ({segments.all ?? 0})</option>
              <option value="active">Active ({segments.active ?? 0})</option>
              <option value="banned">Suspended ({segments.banned ?? 0})</option>
              <option value="email_verified">E-mail verified ({segments.email_verified ?? 0})</option>
              <option value="email_unverified">E-mail unverified ({segments.email_unverified ?? 0})</option>
              <option value="with_orders">With orders ({segments.with_orders ?? 0})</option>
            </select>
          </div>
        </div>

        <DataTable
          rows={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          empty="No customers yet"
          columns={[
            {
              key: 'name',
              label: 'Customer',
              render: (row) => (
                <>
                  <Link href={`/admin/customers/${row.id}`}>
                    <strong>{row.fullname || row.username}</strong>
                  </Link>
                  <span className="d-block" style={{ fontSize: 13 }}>
                    {row.email}
                  </span>
                </>
              ),
            },
            { key: 'mobile', label: 'Mobile', render: (row) => (row.mobile ? `${row.dial_code ?? ''} ${row.mobile}` : '—') },
            { key: 'city', label: 'City', render: (row) => row.city ?? '—' },
            { key: 'orders', label: 'Orders', align: 'end', render: (row) => row.orders_count ?? 0 },
            { key: 'joined', label: 'Joined', render: (row) => formatDate(row.created_at) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge active={row.status} labels={['Active', 'Suspended']} /> },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (row) => (
                <div className="d-flex gap-2 justify-content-end">
                  <Link href={`/admin/customers/${row.id}`} className="btn btn--sm btn-outline--primary">
                    View
                  </Link>
                  {can('customer.status') && (
                    <button
                      className={`btn btn--sm ${row.status ? 'btn-outline--warning' : 'btn-outline--success'}`}
                      type="button"
                      onClick={async () => {
                        const reason = row.status ? window.prompt('Reason for suspending this customer?') : null;
                        try {
                          const { message } = await apiWithMessage(`/admin/customers/${row.id}/status`, {
                            method: 'POST',
                            auth: 'admin',
                            body: { ban_reason: reason },
                          });
                          toastSuccess(message);
                          await load();
                        } catch (error) {
                          toastError(error instanceof ApiError ? error.message : 'Could not change the status');
                        }
                      }}
                    >
                      {row.status ? 'Suspend' : 'Reactivate'}
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

export function CustomerDetailScreen({ id }: { id: number }) {
  const { can } = useAdmin();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<Record<string, number | string | null>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notify, setNotify] = useState({ subject: '', message: '' });

  useEffect(() => {
    api<{ customer: Customer; stats: Record<string, number | string | null>; recent_orders: Order[] }>(
      `/admin/customers/${id}`,
      { auth: 'admin' },
    )
      .then((data) => {
        setCustomer(data.customer);
        setStats(data.stats ?? {});
        setOrders(data.recent_orders ?? []);
      })
      .catch((error) => toastError(error instanceof ApiError ? error.message : 'Could not load the customer'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="vp-skeleton" style={{ height: 260 }} />;
  if (!customer) return <Card>Customer not found.</Card>;

  return (
    <>
      <AdminPageHeader title={customer.fullname || customer.username}>
        {can('customer.notify') && (
          <button className="btn btn--sm btn--primary" type="button" onClick={() => setNotifyOpen(true)}>
            Send notification
          </button>
        )}
        <Link href="/admin/customers" className="btn btn--sm btn-outline--primary">
          Back to customers
        </Link>
      </AdminPageHeader>

      <div className="row gy-4">
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Orders" value={Number(stats.orders_total ?? 0)} icon="las la-shopping-bag" bg="primary" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Delivered" value={Number(stats.orders_delivered ?? 0)} icon="las la-check-circle" bg="success" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Cancelled" value={Number(stats.orders_cancelled ?? 0)} icon="las la-times-circle" bg="warning" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Total spent" value={showAmount(Number(stats.total_spent ?? 0))} icon="las la-wallet" bg="info" />
        </div>
      </div>

      <div className="row gy-4 mt-1">
        <div className="col-lg-4">
          <Card title="Profile">
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>E-mail</span> <strong>{customer.email}</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Mobile</span> <strong>{customer.mobile ?? '—'}</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>City</span> <strong>{customer.city ?? '—'}</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Status</span> <StatusBadge active={customer.status} labels={['Active', 'Suspended']} />
              </li>
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Joined</span> <strong>{formatDate(customer.created_at)}</strong>
              </li>
            </ul>
          </Card>
        </div>

        <div className="col-lg-8">
          <Card title="Recent orders">
            <div className="table-responsive">
              <table className="table table--light style--two">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Branch</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/admin/orders/${order.id}`}>{order.order_number}</Link>
                      </td>
                      <td>{order.branch?.name ?? '—'}</td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>
                        <span className="badge badge--primary">{order.status_label}</span>
                      </td>
                      <td className="text-end">{showAmount(order.total)}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="table-empty">
                        No orders from this customer yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={notifyOpen} title="Send a notification" onClose={() => setNotifyOpen(false)}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();

            try {
              const { message } = await apiWithMessage(`/admin/customers/${id}/notify`, {
                method: 'POST',
                auth: 'admin',
                body: notify,
              });
              toastSuccess(message);
              setNotifyOpen(false);
              setNotify({ subject: '', message: '' });
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : 'Could not send the notification');
            }
          }}
        >
          <Field label="Subject" required className="col-12">
            <input className="form-control" required value={notify.subject} onChange={(event) => setNotify((c) => ({ ...c, subject: event.target.value }))} />
          </Field>
          <Field label="Message" required className="col-12">
            <textarea className="form-control" rows={5} required value={notify.message} onChange={(event) => setNotify((c) => ({ ...c, message: event.target.value }))} />
          </Field>
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn--primary" type="submit">
              Send
            </button>
            <button className="btn btn-outline--primary" type="button" onClick={() => setNotifyOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ================================= Deposits =============================== */

type DepositRow = {
  id: number;
  trx: string;
  customer: string;
  email: string | null;
  order_number: string | null;
  method: string | null;
  amount: number;
  charge: number;
  final_amount: number;
  currency: string | null;
  detail: Record<string, string> | null;
  status: number;
  status_label: string;
  admin_feedback: string | null;
  created_at: string;
};

export function DepositsScreen() {
  const { can } = useAdmin();

  const [rows, setRows] = useState<DepositRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ deposits: DepositRow[]; pagination: PaginationMeta }>(
        `/admin/deposits?page=${page}&status=${status}`,
        { auth: 'admin' },
      );
      setRows(data.deposits ?? []);
      setPagination(data.pagination ?? null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load payments');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminPageHeader title="Payments" />

      <Card>
        <div className="admin-filter-bar">
          {(
            [
              ['pending', 'Awaiting review'],
              ['successful', 'Approved'],
              ['rejected', 'Rejected'],
              ['initiated', 'Initiated'],
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
          empty="No payments here"
          columns={[
            { key: 'trx', label: 'Reference', render: (row) => <strong>{row.trx}</strong> },
            {
              key: 'customer',
              label: 'Customer',
              render: (row) => (
                <>
                  <span className="d-block">{row.customer}</span>
                  <span className="d-block" style={{ fontSize: 13 }}>
                    {row.email ?? ''}
                  </span>
                </>
              ),
            },
            { key: 'order', label: 'Order', render: (row) => row.order_number ?? '—' },
            { key: 'method', label: 'Method', render: (row) => row.method ?? '—' },
            {
              key: 'detail',
              label: 'Details',
              render: (row) =>
                row.detail ? (
                  <ul className="mb-0 ps-3" style={{ fontSize: 13 }}>
                    {Object.entries(row.detail).map(([key, value]) => (
                      <li key={key}>
                        {key.replace(/_/g, ' ')}: <strong>{String(value)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  '—'
                ),
            },
            { key: 'amount', label: 'Amount', align: 'end', render: (row) => showAmount(row.final_amount) },
            { key: 'status', label: 'Status', render: (row) => <span className="badge badge--primary">{row.status_label}</span> },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (row) =>
                row.status === 2 && can('deposit.approve') ? (
                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      className="btn btn--sm btn-outline--success"
                      type="button"
                      onClick={async () => {
                        try {
                          const { message } = await apiWithMessage(`/admin/deposits/${row.id}/approve`, {
                            method: 'POST',
                            auth: 'admin',
                          });
                          toastSuccess(message);
                          await load();
                        } catch (error) {
                          toastError(error instanceof ApiError ? error.message : 'Could not approve');
                        }
                      }}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn--sm btn-outline--danger"
                      type="button"
                      onClick={async () => {
                        const reason = window.prompt('Why is this payment rejected?');
                        if (!reason) return;

                        try {
                          const { message } = await apiWithMessage(`/admin/deposits/${row.id}/reject`, {
                            method: 'POST',
                            auth: 'admin',
                            body: { message: reason },
                          });
                          toastSuccess(message);
                          await load();
                        } catch (error) {
                          toastError(error instanceof ApiError ? error.message : 'Could not reject');
                        }
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 13 }}>{row.admin_feedback ?? '—'}</span>
                ),
            },
          ]}
        />
      </Card>
    </>
  );
}
