'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AdminPageHeader, AdminWidget } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminProviders';
import { Card, DataTable, Modal } from '@/components/admin/ui';
import { ApiError, api, apiWithMessage } from '@/lib/api';
import { formatDate, showAmount } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Pagination as PaginationMeta } from '@/types';

type CommissionRow = {
  id: number;
  order_id: number;
  order_number: string | null;
  staff: string | null;
  admin_id: number;
  branch: string | null;
  rate: number;
  basis_amount: number;
  amount: number;
  status: number;
  status_label: string;
  note: string | null;
  payout_reference: string | null;
  earned_at: string | null;
  paid_at: string | null;
};

type Payload = {
  commissions: CommissionRow[];
  pagination: PaginationMeta;
  totals: { pending: number; approved: number; paid: number; reversed: number; outstanding: number; orders: number };
  by_staff: { admin_id: number; staff: string; orders: number; total: number; outstanding: number }[];
  scheme: { enabled: boolean; rate: number; attribution: string; basis: string; event: string };
  can_manage: boolean;
  sees_everyone: boolean;
  staff: { id: number; name: string }[];
};

const STATUS_PENDING = 0;
const STATUS_APPROVED = 1;
const STATUS_PAID = 2;
const STATUS_REVERSED = 3;

function CommissionStatusBadge({ status, label }: { status: number; label: string }) {
  const tone =
    status === STATUS_PENDING ? 'warning'
      : status === STATUS_APPROVED ? 'info'
        : status === STATUS_PAID ? 'success'
          : 'danger';

  return <span className={`badge badge--${tone}`}>{label}</span>;
}

/**
 * Commission statement.
 *
 * Every figure here is summed from `order_commissions` rows the API returned.
 * Nothing is projected or estimated: where a worker has earned nothing the
 * page says zero, rather than showing a balance no record backs.
 */
export function CommissionScreen() {
  const { admin } = useAdmin();

  const [data, setData] = useState<Payload | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ admin_id: '', status: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ row: CommissionRow; status: number } | null>(null);
  const [reference, setReference] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inFlight = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const query = new URLSearchParams({ page: String(page) });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });

      setData(await api<Payload>(`/admin/commissions?${query.toString()}`, { auth: 'admin' }));
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load commission records');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilter = (patch: Partial<typeof filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const confirm = async () => {
    if (!pending || inFlight.current) return;

    inFlight.current = true;
    setBusy(true);
    setActionError(null);

    try {
      const { message } = await apiWithMessage(`/admin/commissions/${pending.row.id}/status`, {
        method: 'POST',
        auth: 'admin',
        body: { status: pending.status, payout_reference: reference.trim() || null },
      });

      await load();

      toastSuccess(message);
      setPending(null);
      setReference('');
    } catch (error) {
      const reason = error instanceof ApiError ? error.message : 'That could not be recorded';
      setActionError(reason);
      toastError(reason);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const totals = data?.totals;
  const scheme = data?.scheme;
  const mine = !data?.sees_everyone;

  return (
    <>
      <AdminPageHeader title={mine ? 'My commission' : 'Commission'} />

      {/* What the figures below were worked out under — stated, not implied. */}
      {scheme && (
        <div className={`vp-scheme-note ${scheme.enabled ? '' : 'vp-scheme-note--off'}`}>
          {scheme.enabled ? (
            <>
              <strong>{scheme.rate}% of the order subtotal</strong>
              <span>{scheme.event}</span>
              <span>{scheme.basis}</span>
            </>
          ) : (
            <>
              <strong>No commission scheme is running</strong>
              <span>
                Nothing is being recorded. A super administrator can set a rate under{' '}
                <Link href="/admin/settings/general">Settings → General</Link>.
              </span>
            </>
          )}
        </div>
      )}

      <div className="row gy-4 mb-4 vp-priority-metrics">
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Outstanding" value={showAmount(totals?.outstanding ?? 0)} icon="las la-hand-holding-usd" bg="primary" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Awaiting approval" value={showAmount(totals?.pending ?? 0)} icon="las la-hourglass-half" bg="warning" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Paid" value={showAmount(totals?.paid ?? 0)} icon="las la-check-circle" bg="success" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Orders counted" value={totals?.orders ?? 0} icon="las la-shopping-cart" bg="info" />
        </div>
      </div>

      {!mine && (data?.by_staff.length ?? 0) > 0 && (
        <Card title="By staff member" className="mb-4">
          <div className="table-responsive">
            <table className="table table--light style--two vp-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th className="text-end">Orders</th>
                  <th className="text-end">Earned</th>
                  <th className="text-end">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {data?.by_staff.map((row) => (
                  <tr key={row.admin_id}>
                    <td data-label="Staff">
                      <strong>{row.staff}</strong>
                    </td>
                    <td data-label="Orders" className="text-end">{row.orders}</td>
                    <td data-label="Earned" className="text-end">{showAmount(row.total)}</td>
                    <td data-label="Outstanding" className="text-end">
                      <strong>{showAmount(row.outstanding)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <div className="admin-filter-bar">
          {!mine && (
            <div className="form-group">
              <label className="form-label">Staff</label>
              <select className="form-select" value={filters.admin_id} onChange={(event) => applyFilter({ admin_id: event.target.value })}>
                <option value="">Everyone</option>
                {data?.staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={filters.status} onChange={(event) => applyFilter({ status: event.target.value })}>
              <option value="">All</option>
              <option value={STATUS_PENDING}>Pending</option>
              <option value={STATUS_APPROVED}>Approved</option>
              <option value={STATUS_PAID}>Paid</option>
              <option value={STATUS_REVERSED}>Reversed</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">From</label>
            <input className="form-control" type="date" value={filters.from} onChange={(event) => applyFilter({ from: event.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <input className="form-control" type="date" value={filters.to} onChange={(event) => applyFilter({ to: event.target.value })} />
          </div>
        </div>

        <DataTable
          rows={data?.commissions ?? []}
          loading={loading}
          pagination={data?.pagination ?? null}
          onPageChange={setPage}
          rowKey={(row) => row.id}
          empty={
            scheme?.enabled
              ? 'No commission has been recorded yet. It is added when an order is marked delivered.'
              : 'No commission scheme is running, so nothing has been recorded.'
          }
          columns={[
            {
              key: 'order',
              label: 'Order',
              nowrap: true,
              render: (row) => (
                <>
                  <Link href={`/admin/orders/${row.order_id}`}>
                    <strong>{row.order_number ?? `#${row.order_id}`}</strong>
                  </Link>
                  <span className="d-block text-muted" style={{ fontSize: 13 }}>
                    {row.earned_at ? formatDate(row.earned_at) : '—'}
                  </span>
                </>
              ),
            },
            ...(mine ? [] : [{ key: 'staff', label: 'Staff', render: (row: CommissionRow) => row.staff ?? '—' }]),
            { key: 'basis', label: 'Order value', align: 'end' as const, nowrap: true, render: (row: CommissionRow) => showAmount(row.basis_amount) },
            { key: 'rate', label: 'Rate', align: 'end' as const, nowrap: true, render: (row: CommissionRow) => `${row.rate}%` },
            {
              key: 'amount',
              label: 'Commission',
              align: 'end' as const,
              nowrap: true,
              render: (row: CommissionRow) => <strong>{showAmount(row.amount)}</strong>,
            },
            {
              key: 'status',
              label: 'Status',
              nowrap: true,
              render: (row: CommissionRow) => (
                <>
                  <CommissionStatusBadge status={row.status} label={row.status_label} />
                  {row.note && (
                    <span className="d-block text-muted" style={{ fontSize: 12 }}>
                      {row.note}
                    </span>
                  )}
                </>
              ),
            },
            ...(data?.can_manage
              ? [
                  {
                    key: 'actions',
                    label: 'Action',
                    align: 'end' as const,
                    nowrap: true,
                    render: (row: CommissionRow) =>
                      row.status === STATUS_PENDING || row.status === STATUS_APPROVED ? (
                        <button
                          className="btn btn--sm btn-outline--primary"
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setReference(row.payout_reference ?? '');
                            setPending({ row, status: row.status === STATUS_PENDING ? STATUS_APPROVED : STATUS_PAID });
                          }}
                        >
                          {row.status === STATUS_PENDING ? 'Approve' : 'Mark paid'}
                        </button>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 13 }}>
                          {row.payout_reference ?? '—'}
                        </span>
                      ),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      <Modal
        open={pending !== null}
        title={pending?.status === STATUS_PAID ? 'Record this payout' : 'Approve this commission'}
        onClose={() => {
          if (inFlight.current) return;
          setPending(null);
          setActionError(null);
        }}
      >
        {pending && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            <p className="mb-3">
              <strong>{showAmount(pending.row.amount)}</strong> for{' '}
              <strong>{pending.row.staff ?? admin?.name}</strong> on order{' '}
              <strong>{pending.row.order_number}</strong>.
            </p>

            {pending.status === STATUS_PAID && (
              <div className="form-group">
                <label className="form-label" htmlFor="vp-payout-ref">
                  Payout reference
                </label>
                <input
                  id="vp-payout-ref"
                  className="form-control"
                  maxLength={120}
                  value={reference}
                  disabled={busy}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="e.g. the payroll run this went out with"
                />
                <small className="d-block mt-1 text-muted">
                  Optional, but it is what ties this record to the money that actually left.
                </small>
              </div>
            )}

            {actionError && (
              <div className="vp-order-error" role="alert">
                {actionError}
              </div>
            )}

            <div className="vp-order-dialog-actions">
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? 'Working…' : pending.status === STATUS_PAID ? 'Mark as paid' : 'Approve'}
              </button>
              <button
                className="btn btn-outline--primary"
                type="button"
                disabled={busy}
                onClick={() => {
                  setPending(null);
                  setActionError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
