'use client';

import { useCallback, useEffect, useState } from 'react';

import { AdminPageHeader, AdminWidget } from '@/components/admin/AdminShell';
import { Card, DataTable, StockPill } from '@/components/admin/ui';
import { ApiError, api } from '@/lib/api';
import { formatDate, showAmount, showCompactAmount } from '@/lib/format';
import { toastError } from '@/lib/toast';
import type { Pagination as PaginationMeta } from '@/types';

function DateRange({
  range,
  onChange,
}: {
  range: { from: string; to: string };
  onChange: (next: { from: string; to: string }) => void;
}) {
  return (
    <div className="admin-filter-bar">
      <div className="form-group">
        <label className="form-label">From</label>
        <input className="form-control" type="date" value={range.from} onChange={(event) => onChange({ ...range, from: event.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">To</label>
        <input className="form-control" type="date" value={range.to} onChange={(event) => onChange({ ...range, to: event.target.value })} />
      </div>
    </div>
  );
}

/* ================================ Sales report ============================ */

type SalesReport = {
  from: string;
  to: string;
  summary: {
    orders: number;
    gross: number;
    revenue: number;
    discount: number;
    tax: number;
    shipping: number;
    delivered: number;
    cancelled: number;
    returned: number;
    average_order_value: number;
  };
  daily: { date: string; orders: number; gross: number; revenue: number; discount: number; tax: number; shipping: number }[];
  by_branch: { branch_id: number; branch: string; orders: number; revenue: number }[];
  top_products: { id: number; name: string; sku: string | null; sold: number; revenue: number }[];
};

export function SalesReportScreen() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setData(await api<SalesReport>(`/admin/reports/sales?from=${range.from}&to=${range.to}`, { auth: 'admin' }));
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load the report');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const max = Math.max(...(data?.daily ?? []).map((row) => row.revenue), 1);

  return (
    <>
      <AdminPageHeader title="Sales report" />

      <Card className="mb-4">
        <DateRange range={range} onChange={setRange} />
      </Card>

      {loading ? (
        <div className="vp-skeleton" style={{ height: 240 }} />
      ) : (
        <>
          <div className="row gy-4">
            <div className="col-xxl-3 col-sm-6">
              <AdminWidget title="Orders" value={data?.summary.orders ?? 0} icon="las la-shopping-cart" bg="primary" />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <AdminWidget title="Revenue (paid)" value={showCompactAmount(data?.summary.revenue ?? 0)} icon="las la-money-bill" bg="success" />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <AdminWidget title="Average order" value={showCompactAmount(data?.summary.average_order_value ?? 0)} icon="las la-chart-line" bg="info" />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <AdminWidget title="Discounts given" value={showCompactAmount(data?.summary.discount ?? 0)} icon="las la-tags" bg="warning" />
            </div>
          </div>

          <Card title="Daily revenue" className="mt-4">
            <div className="mini-chart">
              {(data?.daily ?? []).map((row) => (
                <div
                  className="mini-chart__bar"
                  key={row.date}
                  style={{ height: `${Math.max(2, (row.revenue / max) * 100)}%` }}
                  title={`${row.date}: ${showAmount(row.revenue)}`}
                />
              ))}
            </div>
            <div className="mini-chart__legend">
              <span>{data?.from}</span>
              <span>{data?.to}</span>
            </div>
          </Card>

          <div className="row gy-4 mt-1">
            <div className="col-lg-5">
              <Card title="Revenue by branch">
                <DataTable
                  rows={data?.by_branch ?? []}
                  rowKey={(row) => row.branch_id ?? row.branch}
                  empty="No branch sales in this window"
                  columns={[
                    { key: 'branch', label: 'Branch', render: (row) => row.branch },
                    { key: 'orders', label: 'Orders', align: 'end', render: (row) => row.orders },
                    { key: 'revenue', label: 'Revenue', align: 'end', render: (row) => showAmount(row.revenue) },
                  ]}
                />
              </Card>
            </div>

            <div className="col-lg-7">
              <Card title="Best sellers">
                <DataTable
                  rows={data?.top_products ?? []}
                  rowKey={(row) => row.id}
                  empty="No sales in this window"
                  columns={[
                    { key: 'name', label: 'Product', render: (row) => row.name },
                    { key: 'sku', label: 'SKU', render: (row) => row.sku ?? '—' },
                    { key: 'sold', label: 'Units', align: 'end', render: (row) => row.sold },
                    { key: 'revenue', label: 'Revenue', align: 'end', render: (row) => showAmount(row.revenue) },
                  ]}
                />
              </Card>
            </div>
          </div>

          <Card title="Daily breakdown" className="mt-4">
            <DataTable
              rows={data?.daily ?? []}
              rowKey={(row) => row.date}
              empty="Nothing to show"
              columns={[
                { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
                { key: 'orders', label: 'Orders', align: 'end', render: (row) => row.orders },
                { key: 'gross', label: 'Gross', align: 'end', render: (row) => showAmount(row.gross) },
                { key: 'revenue', label: 'Paid', align: 'end', render: (row) => showAmount(row.revenue) },
                { key: 'discount', label: 'Discount', align: 'end', render: (row) => showAmount(row.discount) },
                { key: 'tax', label: 'Tax', align: 'end', render: (row) => showAmount(row.tax) },
                { key: 'shipping', label: 'Delivery', align: 'end', render: (row) => showAmount(row.shipping) },
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}

/* ============================= Inventory report =========================== */

export function InventoryReportScreen() {
  const [data, setData] = useState<{
    summary: { items: number; total_units: number; low_stock: number; out_of_stock: number; stock_value: number };
    rows: {
      branch: string | null;
      product: string | null;
      sku: string | null;
      variation_id: number;
      stock_quantity: number;
      reserved_quantity: number;
      available: number;
      min_stock_quantity: number;
      cost_price: number;
      stock_value: number;
      is_low: boolean;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<NonNullable<typeof data>>('/admin/reports/inventory', { auth: 'admin' })
      .then(setData)
      .catch((error) => toastError(error instanceof ApiError ? error.message : 'Could not load the report'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminPageHeader title="Inventory report" />

      <div className="row gy-4 mb-4">
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Tracked lines" value={data?.summary.items ?? 0} icon="las la-list" bg="primary" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Units on hand" value={data?.summary.total_units ?? 0} icon="las la-boxes" bg="info" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Low stock" value={data?.summary.low_stock ?? 0} icon="las la-exclamation-triangle" bg="warning" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Stock value" value={showCompactAmount(data?.summary.stock_value ?? 0)} icon="las la-coins" bg="success" />
        </div>
      </div>

      <Card>
        <DataTable
          rows={data?.rows ?? []}
          loading={loading}
          rowKey={(row) => `${row.branch}-${row.product}-${row.variation_id}`}
          empty="No stock records"
          columns={[
            { key: 'branch', label: 'Branch', render: (row) => row.branch },
            { key: 'product', label: 'Product', render: (row) => row.product },
            { key: 'sku', label: 'SKU', render: (row) => row.sku ?? '—' },
            { key: 'stock', label: 'On hand', align: 'end', render: (row) => <StockPill quantity={row.stock_quantity} minimum={row.min_stock_quantity} /> },
            { key: 'reserved', label: 'Reserved', align: 'end', render: (row) => row.reserved_quantity },
            { key: 'available', label: 'Available', align: 'end', render: (row) => row.available },
            { key: 'value', label: 'Value', align: 'end', render: (row) => showAmount(row.stock_value) },
          ]}
        />
      </Card>
    </>
  );
}

/* ============================== Login history ============================= */

export function LoginHistoryScreen() {
  const [rows, setRows] = useState<{ id: number; guard: string; account: string | null; ip: string | null; browser: string | null; os: string | null; country: string | null; created_at: string }[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [guard, setGuard] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    api<{ logins: typeof rows; pagination: PaginationMeta }>(`/admin/reports/login-history?page=${page}&guard=${guard}`, {
      auth: 'admin',
    })
      .then((data) => {
        setRows(data.logins ?? []);
        setPagination(data.pagination ?? null);
      })
      .catch((error) => toastError(error instanceof ApiError ? error.message : 'Could not load the report'))
      .finally(() => setLoading(false));
  }, [page, guard]);

  return (
    <>
      <AdminPageHeader title="Login history" />

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label">Account type</label>
            <select className="form-select" value={guard} onChange={(event) => { setGuard(event.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="admin">Staff</option>
              <option value="user">Customers</option>
            </select>
          </div>
        </div>

        <DataTable
          rows={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          empty="No logins recorded"
          columns={[
            { key: 'account', label: 'Account', render: (row) => row.account ?? '—' },
            { key: 'guard', label: 'Type', render: (row) => <span className="badge badge--primary text-capitalize">{row.guard}</span> },
            { key: 'ip', label: 'IP', render: (row) => row.ip ?? '—' },
            { key: 'browser', label: 'Browser', render: (row) => `${row.browser ?? '—'} · ${row.os ?? ''}` },
            { key: 'date', label: 'When', render: (row) => formatDate(row.created_at, true) },
          ]}
        />
      </Card>
    </>
  );
}

/* =========================== Notification history ========================= */

export function NotificationHistoryScreen() {
  const [rows, setRows] = useState<{ id: number; sent_to: string | null; subject: string | null; notification_type: string | null; sender: string | null; created_at: string }[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    api<{ logs: typeof rows; pagination: PaginationMeta }>(`/admin/reports/notification-history?page=${page}&type=${type}`, {
      auth: 'admin',
    })
      .then((data) => {
        setRows(data.logs ?? []);
        setPagination(data.pagination ?? null);
      })
      .catch((error) => toastError(error instanceof ApiError ? error.message : 'Could not load the report'))
      .finally(() => setLoading(false));
  }, [page, type]);

  return (
    <>
      <AdminPageHeader title="Notification history" />

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label">Channel</label>
            <select className="form-select" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="email">E-mail</option>
              <option value="sms">SMS</option>
            </select>
          </div>
        </div>

        <DataTable
          rows={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          empty="Nothing sent yet"
          columns={[
            { key: 'to', label: 'Sent to', render: (row) => row.sent_to ?? '—' },
            { key: 'subject', label: 'Subject', render: (row) => row.subject ?? '—' },
            { key: 'type', label: 'Channel', render: (row) => <span className="badge badge--primary text-uppercase">{row.notification_type}</span> },
            { key: 'sender', label: 'Sender', render: (row) => row.sender ?? 'system' },
            { key: 'date', label: 'When', render: (row) => formatDate(row.created_at, true) },
          ]}
        />
      </Card>
    </>
  );
}

/* ================================ Audit log =============================== */

export function AuditLogScreen() {
  const [rows, setRows] = useState<{
    id: number;
    event: string;
    actor_type: string;
    actor_name: string | null;
    branch: string | null;
    description: string | null;
    auditable_type: string | null;
    auditable_id: number | null;
    ip_address: string | null;
    created_at: string;
  }[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ event: '', search: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const query = new URLSearchParams({ page: String(page) });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });

    api<{ logs: typeof rows; pagination: PaginationMeta; events: string[] }>(`/admin/reports/audit-logs?${query.toString()}`, {
      auth: 'admin',
    })
      .then((data) => {
        setRows(data.logs ?? []);
        setPagination(data.pagination ?? null);
        setEvents(data.events ?? []);
      })
      .catch((error) => toastError(error instanceof ApiError ? error.message : 'Could not load the audit log'))
      .finally(() => setLoading(false));
  }, [page, filters]);

  return (
    <>
      <AdminPageHeader title="Audit log" />

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label">Search</label>
            <input className="form-control" placeholder="Description or actor" value={filters.search} onChange={(event) => { setFilters((c) => ({ ...c, search: event.target.value })); setPage(1); }} />
          </div>
          <div className="form-group">
            <label className="form-label">Event</label>
            <select className="form-select" value={filters.event} onChange={(event) => { setFilters((c) => ({ ...c, event: event.target.value })); setPage(1); }}>
              <option value="">All events</option>
              {events.map((event) => (
                <option value={event} key={event}>
                  {event}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">From</label>
            <input className="form-control" type="date" value={filters.from} onChange={(event) => setFilters((c) => ({ ...c, from: event.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <input className="form-control" type="date" value={filters.to} onChange={(event) => setFilters((c) => ({ ...c, to: event.target.value }))} />
          </div>
        </div>

        <DataTable
          rows={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          empty="No activity recorded"
          columns={[
            { key: 'date', label: 'When', render: (row) => formatDate(row.created_at, true) },
            { key: 'actor', label: 'Who', render: (row) => `${row.actor_name ?? 'System'} (${row.actor_type})` },
            { key: 'event', label: 'Event', render: (row) => <span className="badge badge--primary">{row.event}</span> },
            { key: 'description', label: 'Description', render: (row) => row.description ?? '—' },
            { key: 'branch', label: 'Branch', render: (row) => row.branch ?? '—' },
            { key: 'ip', label: 'IP', render: (row) => row.ip_address ?? '—' },
          ]}
        />
      </Card>
    </>
  );
}
