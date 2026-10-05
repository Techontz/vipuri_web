'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { AdminPageHeader, AdminWidget } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminProviders';
import { Card, DataTable, Field, Modal, StatusBadge } from '@/components/admin/ui';
import { ApiError, api, apiWithMessage } from '@/lib/api';
import { formatDate, showAmount } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Branch, Pagination as PaginationMeta } from '@/types';

const EMPTY_BRANCH = {
  name: '',
  code: '',
  email: '',
  dial_code: '+255',
  phone: '',
  address: '',
  city: '',
  region: '',
  postal_code: '',
  latitude: '',
  longitude: '',
  is_default: false,
  is_pickup_point: true,
  status: true,
};

/** Branch list + create/edit, the heart of the VIPURI multi-branch model. */
export function BranchesScreen() {
  const { can, isSuperAdmin } = useAdmin();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState({ ...EMPTY_BRANCH });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ branches: Branch[]; pagination: PaginationMeta }>(
        `/admin/branches?page=${page}&search=${encodeURIComponent(search)}`,
        { auth: 'admin' },
      );
      setBranches(data.branches ?? []);
      setPagination(data.pagination ?? null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load branches');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_BRANCH });
    setModalOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setForm({
      name: branch.name,
      code: branch.code,
      email: branch.email ?? '',
      dial_code: branch.dial_code ?? '+255',
      phone: branch.phone ?? '',
      address: branch.address ?? '',
      city: branch.city ?? '',
      region: branch.region ?? '',
      postal_code: branch.postal_code ?? '',
      latitude: branch.latitude ? String(branch.latitude) : '',
      longitude: branch.longitude ? String(branch.longitude) : '',
      is_default: branch.is_default,
      is_pickup_point: branch.is_pickup_point,
      status: branch.status,
    });
    setModalOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const { message } = await apiWithMessage(editing ? `/admin/branches/${editing.id}` : '/admin/branches', {
        method: 'POST',
        auth: 'admin',
        body: {
          ...form,
          latitude: form.latitude === '' ? null : Number(form.latitude),
          longitude: form.longitude === '' ? null : Number(form.longitude),
        },
      });

      toastSuccess(message);
      setModalOpen(false);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not save the branch');
    } finally {
      setBusy(false);
    }
  };

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <>
      <AdminPageHeader title="Branches">
        {can('branch.create') && (
          <button className="btn btn--primary btn--sm" type="button" onClick={openCreate}>
            <i className="las la-plus" /> Add branch
          </button>
        )}
      </AdminPageHeader>

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              className="form-control"
              placeholder="Name, code or city"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <DataTable
          rows={branches}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(branch) => branch.id}
          empty="No branches yet"
          columns={[
            {
              key: 'name',
              label: 'Branch',
              render: (branch) => (
                <>
                  <Link href={`/admin/branches/${branch.id}`}>
                    <strong>{branch.name}</strong>
                  </Link>
                  <span className="d-block" style={{ fontSize: 13 }}>
                    {branch.code}
                    {branch.is_default ? ' · Head office' : ''}
                  </span>
                </>
              ),
            },
            { key: 'city', label: 'City', render: (branch) => branch.city ?? '—' },
            {
              key: 'contact',
              label: 'Contact',
              render: (branch) => (
                <>
                  <span className="d-block">{branch.phone ? `${branch.dial_code ?? ''} ${branch.phone}` : '—'}</span>
                  <span className="d-block" style={{ fontSize: 13 }}>
                    {branch.email ?? ''}
                  </span>
                </>
              ),
            },
            { key: 'staff', label: 'Staff', align: 'end', render: (branch) => branch.staff_count ?? 0 },
            { key: 'orders', label: 'Orders', align: 'end', render: (branch) => branch.orders_count ?? 0 },
            { key: 'status', label: 'Status', render: (branch) => <StatusBadge active={branch.status} /> },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (branch) => (
                <div className="d-flex gap-2 justify-content-end">
                  <Link href={`/admin/branches/${branch.id}`} className="btn btn--sm btn-outline--primary">
                    View
                  </Link>
                  {can('branch.update') && (
                    <button className="btn btn--sm btn-outline--primary" type="button" onClick={() => openEdit(branch)}>
                      Edit
                    </button>
                  )}
                  {can('branch.status') && (
                    <button
                      className={`btn btn--sm ${branch.status ? 'btn-outline--warning' : 'btn-outline--success'}`}
                      type="button"
                      onClick={async () => {
                        try {
                          const { message } = await apiWithMessage(`/admin/branches/${branch.id}/status`, {
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
                      {branch.status ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} title={editing ? `Edit ${editing.name}` : 'Add branch'} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={submit}>
          <div className="row">
            <Field label="Branch name" required>
              <input className="form-control" required value={form.name} onChange={update('name')} />
            </Field>
            <Field label="Branch code" required hint="Short unique code, e.g. DSM-01">
              <input className="form-control" required value={form.code} onChange={update('code')} />
            </Field>
            <Field label="E-mail">
              <input className="form-control" type="email" value={form.email} onChange={update('email')} />
            </Field>
            <Field label="Phone">
              <div className="input-group">
                <span className="input-group-text">{form.dial_code}</span>
                <input className="form-control" value={form.phone} onChange={update('phone')} />
              </div>
            </Field>
            <Field label="Address" className="col-12">
              <input className="form-control" value={form.address} onChange={update('address')} />
            </Field>
            <Field label="City">
              <input className="form-control" value={form.city} onChange={update('city')} />
            </Field>
            <Field label="Region">
              <input className="form-control" value={form.region} onChange={update('region')} />
            </Field>
            <Field label="Latitude">
              <input className="form-control" type="number" step="any" value={form.latitude} onChange={update('latitude')} />
            </Field>
            <Field label="Longitude">
              <input className="form-control" type="number" step="any" value={form.longitude} onChange={update('longitude')} />
            </Field>

            <div className="col-12 d-flex flex-wrap gap-4 mt-2">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="branch-active"
                  checked={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.checked }))}
                />
                <label className="form-check-label" htmlFor="branch-active">
                  Active
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="branch-pickup"
                  checked={form.is_pickup_point}
                  onChange={(event) => setForm((current) => ({ ...current, is_pickup_point: event.target.checked }))}
                />
                <label className="form-check-label" htmlFor="branch-pickup">
                  Click &amp; collect point
                </label>
              </div>
              {isSuperAdmin && (
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="branch-default"
                    checked={form.is_default}
                    onChange={(event) => setForm((current) => ({ ...current, is_default: event.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="branch-default">
                    Head office / default fulfilment
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="d-flex gap-2 mt-4">
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Update branch' : 'Create branch'}
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

/** Single branch overview with its own operational statistics. */
export function BranchDetailScreen({ id }: { id: number }) {
  const [branch, setBranch] = useState<Branch | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ branch: Branch; stats: Record<string, number> }>(`/admin/branches/${id}`, { auth: 'admin' })
      .then((data) => {
        setBranch(data.branch);
        setStats(data.stats ?? {});
      })
      .catch((error) => toastError(error instanceof ApiError ? error.message : 'Could not load the branch'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="vp-skeleton" style={{ height: 200 }} />;
  if (!branch) return <Card>Branch not found.</Card>;

  return (
    <>
      <AdminPageHeader title={branch.name}>
        <Link href="/admin/branches" className="btn btn--sm btn-outline--primary">
          Back to branches
        </Link>
      </AdminPageHeader>

      <div className="row gy-4">
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Orders" value={stats.orders_total ?? 0} icon="las la-shopping-cart" bg="primary" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Revenue" value={showAmount(stats.revenue ?? 0)} icon="las la-money-bill" bg="success" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Staff" value={stats.staff_total ?? 0} icon="las la-users" bg="info" />
        </div>
        <div className="col-xxl-3 col-sm-6">
          <AdminWidget title="Low stock" value={stats.low_stock_items ?? 0} icon="las la-exclamation-triangle" bg="warning" />
        </div>
      </div>

      <div className="row gy-4 mt-1">
        <div className="col-lg-6">
          <Card title="Branch details">
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Code</span> <strong>{branch.code}</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Status</span> <StatusBadge active={branch.status} />
              </li>
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Phone</span>{' '}
                <strong>
                  {branch.dial_code} {branch.phone}
                </strong>
              </li>
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>E-mail</span> <strong>{branch.email ?? '—'}</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Address</span>{' '}
                <strong className="text-end">
                  {branch.address}
                  {branch.city ? `, ${branch.city}` : ''}
                </strong>
              </li>
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Created</span> <strong>{formatDate(branch.created_at)}</strong>
              </li>
            </ul>
          </Card>
        </div>

        <div className="col-lg-6">
          <Card title="Opening hours">
            {branch.opening_hours ? (
              <ul className="list-group list-group-flush">
                {Object.entries(branch.opening_hours).map(([day, hours]) => (
                  <li className="list-group-item d-flex justify-content-between px-0 text-capitalize" key={day}>
                    <span>{day}</span> <strong>{hours}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-0">No opening hours recorded.</p>
            )}
          </Card>
        </div>
      </div>

      <div className="row gy-4 mt-1">
        <div className="col-12">
          <Card
            title="Quick links"
            actions={
              <div className="d-flex gap-2">
                <Link href={`/admin/inventory?branch_id=${branch.id}`} className="btn btn--sm btn-outline--primary">
                  Branch stock
                </Link>
                <Link href={`/admin/orders?branch_id=${branch.id}`} className="btn btn--sm btn-outline--primary">
                  Branch orders
                </Link>
                <Link href={`/admin/staff?branch_id=${branch.id}`} className="btn btn--sm btn-outline--primary">
                  Branch staff
                </Link>
              </div>
            }
          >
            <p className="mb-0">
              Inventory, orders and staff for this branch open pre-filtered so branch managers land straight on their
              own data.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Company-wide branch performance report (super admin). */
export function BranchPerformanceScreen() {
  const [rows, setRows] = useState<
    {
      id: number;
      name: string;
      code: string;
      city: string | null;
      status: boolean;
      orders: number;
      delivered: number;
      cancelled: number;
      revenue: number;
      staff: number;
      low_stock_items: number;
      out_of_stock_items: number;
    }[]
  >([]);
  const [range, setRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ branches: typeof rows }>(
        `/admin/branches/performance?from=${range.from}&to=${range.to}`,
        { auth: 'admin' },
      );
      setRows(data.branches ?? []);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load the report');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminPageHeader title="Branch performance" />

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label">From</label>
            <input
              className="form-control"
              type="date"
              value={range.from}
              onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <input
              className="form-control"
              type="date"
              value={range.to}
              onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))}
            />
          </div>
        </div>

        <DataTable
          rows={rows}
          loading={loading}
          rowKey={(row) => row.id}
          columns={[
            { key: 'name', label: 'Branch', render: (row) => <Link href={`/admin/branches/${row.id}`}>{row.name}</Link> },
            { key: 'city', label: 'City', render: (row) => row.city ?? '—' },
            { key: 'orders', label: 'Orders', align: 'end', render: (row) => row.orders },
            { key: 'delivered', label: 'Delivered', align: 'end', render: (row) => row.delivered },
            { key: 'cancelled', label: 'Cancelled', align: 'end', render: (row) => row.cancelled },
            { key: 'revenue', label: 'Revenue', align: 'end', render: (row) => showAmount(row.revenue) },
            { key: 'staff', label: 'Staff', align: 'end', render: (row) => row.staff },
            {
              key: 'stock',
              label: 'Stock alerts',
              align: 'end',
              render: (row) => (
                <>
                  <span className="stock-pill low">{row.low_stock_items}</span>{' '}
                  <span className="stock-pill out">{row.out_of_stock_items}</span>
                </>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
