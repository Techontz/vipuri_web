'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AdminPageHeader, AdminWidget } from '@/components/admin/AdminShell';
import { OrderStatusBadge } from '@/components/admin/ui';
import { useAdmin } from '@/components/admin/AdminProviders';
import { api } from '@/lib/api';
import { formatDate, showAmount, showCompactAmount } from '@/lib/format';
import type { Order } from '@/types';

type DashboardPayload = {
  scope: 'company' | 'branch';
  branch: { id: number; name: string; code: string } | null;
  widgets: Record<string, number>;
  sales_chart: { date: string; orders: number; revenue: number }[];
  order_status_chart: { status: number; label: string; total: number }[];
  top_products: { id: number; name: string; slug: string; sold: number; revenue: number }[];
  recent_orders: Order[];
  low_stock: {
    product_id: number;
    product_name: string | null;
    sku: string | null;
    branch: string | null;
    stock_quantity: number;
    min_stock_quantity: number;
  }[];
  recent_activity: { id: number; event: string; actor_name: string | null; description: string | null; created_at: string }[];
  branch_summary:
    | { id: number; name: string; code: string; city: string | null; status: boolean; orders: number; revenue: number; staff: number; low_stock: number }[]
    | null;
};

/** Simple bar chart — the original used ApexCharts; this keeps the same shape without a client bundle. */
function MiniChart({ data }: { data: { date: string; revenue: number }[] }) {
  const max = Math.max(...data.map((row) => row.revenue), 1);

  return (
    <>
      <div className="mini-chart">
        {data.map((row) => (
          <div
            className="mini-chart__bar"
            key={row.date}
            style={{ height: `${Math.max(2, (row.revenue / max) * 100)}%` }}
            title={`${row.date}: ${showAmount(row.revenue)}`}
          />
        ))}
      </div>
      <div className="mini-chart__legend">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </>
  );
}

export function AdminDashboard() {
  const { isSuperAdmin } = useAdmin();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardPayload>('/admin/dashboard', { auth: 'admin' })
      .then(setData)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <AdminPageHeader title="Dashboard" />
        <div className="vp-skeleton vp-skeleton--title" />
        <div className="vp-skeleton" style={{ height: 220 }} />
      </>
    );
  }

  const w = data?.widgets ?? {};

  return (
    <>
      <AdminPageHeader title={data?.scope === 'company' ? 'Company Dashboard' : `${data?.branch?.name} Dashboard`} />

      {/* Orders first. A worker opening this on a phone should reach real
          customer activity without scrolling past decorative statistics, so
          the four counts that imply action come before everything else and
          the recent orders sit directly under them. Every value is from the
          existing dashboard response — no extra request, nothing derived. */}
      <div className="row gy-4 vp-priority-metrics">
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Pending orders" value={w.orders_pending ?? 0} icon="las la-hourglass-half" bg="warning" href="/admin/orders?status=pending" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Processing" value={w.orders_processing ?? 0} icon="las la-cogs" bg="info" href="/admin/orders?status=processing" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Orders today" value={w.orders_today ?? 0} icon="las la-clock" bg="primary" href="/admin/orders" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Revenue today" value={showCompactAmount(w.revenue_today ?? 0)} icon="las la-money-bill-wave" bg="success" href="/admin/reports/sales" />
        </div>
      </div>

      <div className="row gy-4 mt-1">
        <div className="col-12">
          <div className="card box-shadow3">
            <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
              {(w.orders_pending ?? 0) > 0 ? (
                <>
                  <div>
                    <h5 className="mb-1">Orders needing attention</h5>
                    <p className="mb-0 text-muted">
                      {w.orders_pending} pending {(w.orders_pending ?? 0) === 1 ? 'order is' : 'orders are'} waiting to be confirmed.
                    </p>
                  </div>
                  <Link className="btn btn--base" href="/admin/orders?status=pending">
                    View pending orders
                  </Link>
                </>
              ) : (
                <div>
                  <h5 className="mb-1">You&apos;re all caught up</h5>
                  <p className="mb-0 text-muted">No pending orders right now.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row gy-4 mt-1">
        <div className="col-12">
          <div className="card box-shadow3 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Recent orders</h5>
                <Link href="/admin/orders">View all</Link>
              </div>
              <div className="table-responsive">
                {/* data-label on every cell is what lets Part 1's CSS turn
                    these rows into readable cards below 768px. */}
                <table className="table table--light style--two vp-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.recent_orders ?? []).map((order) => (
                      <tr key={order.id}>
                        <td data-label="Order">
                          <Link href={`/admin/orders/${order.id}`}>{order.order_number}</Link>
                          <small className="d-block text-muted">{formatDate(order.created_at)}</small>
                        </td>
                        <td data-label="Customer">{order.customer?.name ?? order.guest?.name ?? 'Guest'}</td>
                        <td data-label="Items">{order.items?.length ?? 0}</td>
                        <td data-label="Status">
                          <OrderStatusBadge status={order.status} label={order.status_label} />
                        </td>
                        <td data-label="Payment">
                          <span className="badge badge--dark">{order.payment_status_label}</span>
                        </td>
                        <td data-label="Total" className="text-end">{showAmount(order.total)}</td>
                      </tr>
                    ))}
                    {(data?.recent_orders ?? []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="table-empty">
                          Your recent orders will appear here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="row gy-4">
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Total orders" value={w.orders_total ?? 0} icon="las la-shopping-cart" bg="primary" href="/admin/orders" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Revenue" value={showCompactAmount(w.revenue_total ?? 0)} icon="las la-money-bill-wave" bg="success" href="/admin/reports/sales" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Low stock items" value={w.low_stock_items ?? 0} icon="las la-exclamation-triangle" bg="danger" href="/admin/inventory?low_stock=1" />
        </div>
      </div>

      <div className="row gy-4 mt-1">
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Revenue this month" value={showCompactAmount(w.revenue_month ?? 0)} icon="las la-calendar" bg="info" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Delivered" value={w.orders_delivered ?? 0} icon="las la-check-circle" bg="success" href="/admin/orders?status=delivered" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Out of stock" value={w.out_of_stock_items ?? 0} icon="las la-times-circle" bg="danger" href="/admin/inventory?out_of_stock=1" />
        </div>
      </div>

      {isSuperAdmin && (
        <div className="row gy-4 mt-1">
          <div className="col-xxl-3 col-sm-6">
            <AdminWidget title="Branches" value={w.branches_total ?? 0} icon="las la-store" bg="primary" href="/admin/branches" />
          </div>
          <div className="col-xxl-3 col-sm-6">
            <AdminWidget title="Branch managers" value={w.managers_total ?? 0} icon="las la-user-tie" bg="info" href="/admin/staff" />
          </div>
          <div className="col-xxl-3 col-sm-6">
            <AdminWidget title="Branch workers" value={w.workers_total ?? 0} icon="las la-users-cog" bg="success" href="/admin/staff" />
          </div>
          <div className="col-xxl-3 col-sm-6">
            <AdminWidget title="Customers" value={w.customers_total ?? 0} icon="las la-users" bg="warning" href="/admin/customers" />
          </div>
        </div>
      )}

      <div className="row gy-4 mt-1">
        <div className="col-xl-8">
          <div className="card box-shadow3 h-100">
            <div className="card-body">
              <h5 className="card-title">Revenue — last 30 days</h5>
              {data?.sales_chart && data.sales_chart.length > 0 ? (
                <MiniChart data={data.sales_chart} />
              ) : (
                <p className="mb-0">No sales recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card box-shadow3 h-100">
            <div className="card-body">
              <h5 className="card-title">Orders by status</h5>
              <ul className="list-group list-group-flush">
                {(data?.order_status_chart ?? []).map((row) => (
                  <li className="list-group-item d-flex justify-content-between px-0" key={row.status}>
                    <span>{row.label}</span>
                    <strong>{row.total}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="row gy-4 mt-1">
        <div className="col-xl-5">
          <div className="card box-shadow3 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Low stock</h5>
                <Link href="/admin/inventory?low_stock=1">Manage</Link>
              </div>
              <div className="table-responsive">
                <table className="table table--light style--two">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Branch</th>
                      <th className="text-end">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.low_stock ?? []).map((row, index) => (
                      <tr key={`${row.product_id}-${index}`}>
                        <td>{row.product_name}</td>
                        <td>{row.branch}</td>
                        <td className="text-end">
                          <span className={`stock-pill ${row.stock_quantity <= 0 ? 'out' : 'low'}`}>
                            {row.stock_quantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(data?.low_stock ?? []).length === 0 && (
                      <tr>
                        <td colSpan={3} className="table-empty">
                          Everything is well stocked
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {data?.branch_summary && (
        <div className="row gy-4 mt-1">
          <div className="col-12">
            <div className="card box-shadow3">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Branch monitor</h5>
                  <Link href="/admin/branches/performance">Full report</Link>
                </div>
                <div className="table-responsive">
                  <table className="table table--light style--two">
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th>City</th>
                        <th>Status</th>
                        <th className="text-end">Orders</th>
                        <th className="text-end">Revenue</th>
                        <th className="text-end">Staff</th>
                        <th className="text-end">Low stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.branch_summary.map((branch) => (
                        <tr key={branch.id}>
                          <td>
                            <Link href={`/admin/branches/${branch.id}`}>{branch.name}</Link>
                          </td>
                          <td>{branch.city ?? '—'}</td>
                          <td>
                            <span className={`badge badge--${branch.status ? 'success' : 'warning'}`}>
                              {branch.status ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-end">{branch.orders}</td>
                          <td className="text-end">{showAmount(branch.revenue)}</td>
                          <td className="text-end">{branch.staff}</td>
                          <td className="text-end">{branch.low_stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row gy-4 mt-1">
        <div className="col-12">
          <div className="card box-shadow3">
            <div className="card-body">
              <h5 className="card-title">Recent activity</h5>
              <ul className="list-group list-group-flush">
                {(data?.recent_activity ?? []).map((row) => (
                  <li className="list-group-item px-0" key={row.id}>
                    <div className="d-flex justify-content-between gap-3 flex-wrap">
                      <span>
                        <strong>{row.actor_name ?? 'System'}</strong> — {row.description ?? row.event}
                      </span>
                      <span style={{ fontSize: 13 }}>{formatDate(row.created_at, true)}</span>
                    </div>
                  </li>
                ))}
                {(data?.recent_activity ?? []).length === 0 && <li className="list-group-item px-0">No activity yet</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
