'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { AdminPageHeader, AdminWidget } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminProviders';
import { Card, DataTable, Field, Modal, StatusBadge } from '@/components/admin/ui';
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

      <div className="row gy-4 mb-4">
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
              onChange={(event) => {
                setFilters((current) => ({ ...current, search: event.target.value }));
                setPage(1);
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={filters.status} onChange={(event) => setFilters((c) => ({ ...c, status: event.target.value }))}>
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
              <select className="form-select" value={filters.branch_id} onChange={(event) => setFilters((c) => ({ ...c, branch_id: event.target.value }))}>
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
            <input className="form-control" type="date" value={filters.from} onChange={(event) => setFilters((c) => ({ ...c, from: event.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <input className="form-control" type="date" value={filters.to} onChange={(event) => setFilters((c) => ({ ...c, to: event.target.value }))} />
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
            { key: 'number', label: 'Order', render: (order) => <Link href={`/admin/orders/${order.id}`}><strong>{order.order_number}</strong></Link> },
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
            { key: 'branch', label: 'Branch', render: (order) => order.branch?.name ?? '—' },
            { key: 'date', label: 'Date', render: (order) => formatDate(order.created_at) },
            { key: 'status', label: 'Status', render: (order) => <span className="badge badge--primary">{order.status_label}</span> },
            { key: 'payment', label: 'Payment', render: (order) => <span className="badge badge--info">{order.payment_status_label}</span> },
            { key: 'total', label: 'Total', align: 'end', render: (order) => showAmount(order.total) },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
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

export function OrderDetailScreen({ id }: { id: number }) {
  const { can, isSuperAdmin } = useAdmin();

  const [order, setOrder] = useState<Order | null>(null);
  const [branches, setBranches] = useState<{ id: number; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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

  if (loading) return <div className="vp-skeleton" style={{ height: 300 }} />;
  if (!order) return <Card>Order not found.</Card>;

  const address = order.shipping_address ?? {};

  const changeStatus = async (status: number) => {
    setBusy(true);

    try {
      const remark = status === 7 ? window.prompt('Reason for cancelling?') ?? undefined : undefined;
      const { message } = await apiWithMessage(`/admin/orders/${order.id}/status`, {
        method: 'POST',
        auth: 'admin',
        body: { status, remark },
      });
      toastSuccess(message);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not update the status');
    } finally {
      setBusy(false);
    }
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

      <div className="row gy-4">
        <div className="col-lg-8">
          <Card title="Items">
            <div className="table-responsive">
              <table className="table table--light style--two">
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
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <img src={imageUrl(item.image)} alt={item.product_name ?? ''} width={40} height={40} style={{ borderRadius: 6, objectFit: 'cover' }} />
                          <div>
                            <strong>{item.product_name}</strong>
                            <span className="d-block" style={{ fontSize: 13 }}>
                              {item.sku ?? ''}
                              {item.variation_label ? ` · ${item.variation_label}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-end">{item.quantity}</td>
                      <td className="text-end">{showAmount(item.price)}</td>
                      <td className="text-end">{showAmount(item.total_tax)}</td>
                      <td className="text-end">{showAmount(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {(order.status_logs ?? []).length > 0 && (
            <Card title="Status history" className="mt-4">
              <ul className="list-group list-group-flush">
                {(order.status_logs ?? []).map((log) => (
                  <li className="list-group-item px-0 d-flex justify-content-between gap-3" key={log.id}>
                    <span>
                      <strong>{log.to_status_label}</strong>
                      {log.remark ? ` — ${log.remark}` : ''}
                      <span className="d-block" style={{ fontSize: 13 }}>
                        by {log.actor_name ?? 'System'}
                      </span>
                    </span>
                    <span style={{ fontSize: 13 }}>{formatDate(log.created_at, true)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {(order.deposits ?? []).length > 0 && (
            <Card title="Payments" className="mt-4">
              <div className="table-responsive">
                <table className="table table--light style--two">
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
                        <td>{deposit.trx}</td>
                        <td>{deposit.method ?? '—'}</td>
                        <td>{formatDate(deposit.created_at)}</td>
                        <td className="text-end">{showAmount(deposit.final_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="col-lg-4">
          <Card title="Summary">
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
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Total</span> <strong>{showAmount(order.total)}</strong>
              </li>
            </ul>
          </Card>

          <Card title="Fulfilment" className="mt-4">
            <p className="mb-2">
              Status: <span className="badge badge--primary">{order.status_label}</span>
            </p>
            <p className="mb-3">
              Payment: <span className="badge badge--info">{order.payment_status_label}</span>
              {order.cod && <span className="badge badge--warning ms-1">COD</span>}
            </p>

            {can('order.update_status') && (
              <>
                <label className="form-label">Change status</label>
                <div className="d-flex flex-wrap gap-2">
                  {ORDER_STATUS.filter((status) => status.value !== order.status).map((status) => (
                    <button
                      key={status.value}
                      className="btn btn--sm btn-outline--primary"
                      type="button"
                      disabled={busy}
                      onClick={() => changeStatus(status.value)}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>

                {order.payment_status !== 1 && (
                  <button
                    className="btn btn--sm btn--success w-100 mt-3"
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        const { message } = await apiWithMessage(`/admin/orders/${order.id}/mark-paid`, {
                          method: 'POST',
                          auth: 'admin',
                        });
                        toastSuccess(message);
                        await load();
                      } catch (error) {
                        toastError(error instanceof ApiError ? error.message : 'Could not mark as paid');
                      }
                    }}
                  >
                    Mark as paid
                  </button>
                )}
              </>
            )}

            {isSuperAdmin && branches.length > 0 && (
              <div className="mt-3">
                <label className="form-label">Fulfilling branch</label>
                <select
                  className="form-select"
                  value={order.branch?.id ?? ''}
                  onChange={async (event) => {
                    try {
                      const { message } = await apiWithMessage(`/admin/orders/${order.id}/branch`, {
                        method: 'POST',
                        auth: 'admin',
                        body: { branch_id: Number(event.target.value) },
                      });
                      toastSuccess(message);
                      await load();
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

          <Card title="Customer" className="mt-4">
            <p className="mb-1">
              <strong>{order.customer?.name ?? order.guest?.name ?? 'Guest'}</strong>
            </p>
            <p className="mb-1">{order.customer?.email ?? order.guest?.email}</p>
            <p className="mb-3">{order.customer?.mobile ?? order.guest?.mobile}</p>

            <h6>Delivery address</h6>
            <p className="mb-0">
              {address.address}
              <br />
              {[address.city, address.state].filter(Boolean).join(', ')}
              <br />
              {address.country_name ?? 'Tanzania'}
            </p>
            {order.note && (
              <>
                <h6 className="mt-3">Order note</h6>
                <p className="mb-0">{order.note}</p>
              </>
            )}
          </Card>
        </div>
      </div>
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
