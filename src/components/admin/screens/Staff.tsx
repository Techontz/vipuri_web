'use client';

import { useCallback, useEffect, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminProviders';
import { Card, DataTable, Field, Modal, StatusBadge } from '@/components/admin/ui';
import { ApiError, api, apiWithMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Pagination as PaginationMeta, StaffMember } from '@/types';

const EMPTY_STAFF = {
  name: '',
  email: '',
  username: '',
  dial_code: '+255',
  mobile: '',
  password: '',
  password_confirmation: '',
  role: '',
  branch_id: '',
};

/**
 * Staff management. A branch manager only ever sees and edits workers in their
 * own branch — enforced by the API; the UI simply reflects it.
 */
export function StaffScreen() {
  const { can, isSuperAdmin, admin } = useAdmin();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string; code: string }[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ ...EMPTY_STAFF });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ staff: StaffMember[]; pagination: PaginationMeta; roles: string[] }>(
        `/admin/staff?page=${page}&search=${encodeURIComponent(search)}&role=${encodeURIComponent(roleFilter)}`,
        { auth: 'admin' },
      );
      setStaff(data.staff ?? []);
      setPagination(data.pagination ?? null);
      setRoles(data.roles ?? []);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load staff');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<{ branches: { id: number; name: string; code: string }[] }>('/admin/branches/options', { auth: 'admin' })
      .then((data) => setBranches(data.branches ?? []))
      .catch(() => undefined);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_STAFF, role: roles[0] ?? '', branch_id: isSuperAdmin ? '' : String(admin?.branch_id ?? '') });
    setModalOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setForm({
      name: member.name,
      email: member.email,
      username: member.username,
      dial_code: member.dial_code ?? '+255',
      mobile: member.mobile ?? '',
      password: '',
      password_confirmation: '',
      role: member.role ?? '',
      branch_id: member.branch_id ? String(member.branch_id) : '',
    });
    setModalOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const body: Record<string, unknown> = { ...form };

      if (!form.password) {
        delete body.password;
        delete body.password_confirmation;
      }

      if (!form.branch_id) delete body.branch_id;

      const { message } = await apiWithMessage(editing ? `/admin/staff/${editing.id}` : '/admin/staff', {
        method: 'POST',
        auth: 'admin',
        body,
      });

      toastSuccess(message);
      setModalOpen(false);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not save the staff member');
    } finally {
      setBusy(false);
    }
  };

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <>
      <AdminPageHeader title="Staff">
        {can('staff.create') && (
          <button className="btn btn--primary btn--sm" type="button" onClick={openCreate}>
            <i className="las la-plus" /> Add staff
          </button>
        )}
      </AdminPageHeader>

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              className="form-control"
              placeholder="Name, e-mail or username"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">All roles</option>
              {roles.map((role) => (
                <option value={role} key={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          rows={staff}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          rowKey={(member) => member.id}
          empty="No staff members yet"
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (member) => (
                <>
                  <strong>{member.name}</strong>
                  <span className="d-block" style={{ fontSize: 13 }}>
                    {member.email}
                  </span>
                </>
              ),
            },
            { key: 'role', label: 'Role', render: (member) => <span className="badge badge--primary">{member.role}</span> },
            { key: 'branch', label: 'Branch', render: (member) => member.branch?.name ?? 'All branches' },
            { key: 'mobile', label: 'Mobile', render: (member) => (member.mobile ? `${member.dial_code} ${member.mobile}` : '—') },
            { key: 'last_login', label: 'Last login', render: (member) => (member.last_login_at ? formatDate(member.last_login_at, true) : 'Never') },
            { key: 'status', label: 'Status', render: (member) => <StatusBadge active={member.status} /> },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (member) => (
                <div className="d-flex gap-2 justify-content-end">
                  {can('staff.update') && (
                    <button className="btn btn--sm btn-outline--primary" type="button" onClick={() => openEdit(member)}>
                      Edit
                    </button>
                  )}
                  {can('staff.status') && member.id !== admin?.id && (
                    <button
                      className={`btn btn--sm ${member.status ? 'btn-outline--warning' : 'btn-outline--success'}`}
                      type="button"
                      onClick={async () => {
                        try {
                          const { message } = await apiWithMessage(`/admin/staff/${member.id}/status`, {
                            method: 'POST',
                            auth: 'admin',
                            body: {},
                          });
                          toastSuccess(message);
                          await load();
                        } catch (error) {
                          toastError(error instanceof ApiError ? error.message : 'Could not change the status');
                        }
                      }}
                    >
                      {member.status ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} title={editing ? `Edit ${editing.name}` : 'Add staff'} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={submit}>
          <div className="row">
            <Field label="Full name" required>
              <input className="form-control" required value={form.name} onChange={update('name')} />
            </Field>
            <Field label="Username" required>
              <input className="form-control" required value={form.username} onChange={update('username')} />
            </Field>
            <Field label="E-mail" required>
              <input className="form-control" type="email" required value={form.email} onChange={update('email')} />
            </Field>
            <Field label="Mobile">
              <div className="input-group">
                <span className="input-group-text">{form.dial_code}</span>
                <input className="form-control" value={form.mobile} onChange={update('mobile')} />
              </div>
            </Field>

            <Field label="Role" required>
              <select className="form-select" required value={form.role} onChange={update('role')} disabled={Boolean(editing) && !isSuperAdmin}>
                <option value="">Choose a role</option>
                {roles.map((role) => (
                  <option value={role} key={role}>
                    {role}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Branch"
              hint={isSuperAdmin ? 'Super admins are company-wide and need no branch.' : 'Staff you create join your branch.'}
            >
              <select
                className="form-select"
                value={form.branch_id}
                onChange={update('branch_id')}
                disabled={!isSuperAdmin || form.role === 'Super Admin'}
              >
                <option value="">{form.role === 'Super Admin' ? 'All branches' : 'Choose a branch'}</option>
                {branches.map((branch) => (
                  <option value={branch.id} key={branch.id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label={editing ? 'New password' : 'Password'} required={!editing} hint="At least 8 characters with upper, lower and a number.">
              <input
                className="form-control"
                type="password"
                required={!editing}
                autoComplete="new-password"
                value={form.password}
                onChange={update('password')}
              />
            </Field>
            <Field label="Confirm password" required={!editing}>
              <input
                className="form-control"
                type="password"
                required={!editing}
                autoComplete="new-password"
                value={form.password_confirmation}
                onChange={update('password_confirmation')}
              />
            </Field>
          </div>

          <div className="d-flex gap-2 mt-4">
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Update staff' : 'Create staff'}
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

/** Role → permission matrix. Editing is restricted to super admins. */
export function RolesScreen() {
  const { isSuperAdmin } = useAdmin();

  const [roles, setRoles] = useState<{ id: number; name: string; permissions: string[]; staff_count: number }[]>([]);
  const [groups, setGroups] = useState<{ group: string; permissions: { name: string; label: string }[] }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{
        roles: { id: number; name: string; permissions: string[]; staff_count: number }[];
        permission_groups: { group: string; permissions: { name: string; label: string }[] }[];
      }>('/admin/staff/roles', { auth: 'admin' });

      setRoles(data.roles ?? []);
      setGroups(data.permission_groups ?? []);

      const first = data.roles?.find((role) => role.name !== 'Super Admin') ?? data.roles?.[0];
      if (first) {
        setSelected(first.id);
        setChecked(new Set(first.permissions));
      }
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load roles');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeRole = roles.find((role) => role.id === selected) ?? null;
  const locked = !isSuperAdmin || activeRole?.name === 'Super Admin';

  return (
    <>
      <AdminPageHeader title="Roles &amp; permissions" />

      <div className="row gy-4">
        <div className="col-lg-4">
          <Card title="Roles">
            <ul className="list-group list-group-flush">
              {roles.map((role) => (
                <li className="list-group-item px-0" key={role.id}>
                  <button
                    className={`btn w-100 text-start ${selected === role.id ? 'btn--primary' : 'btn-outline--primary'}`}
                    type="button"
                    onClick={() => {
                      setSelected(role.id);
                      setChecked(new Set(role.permissions));
                    }}
                  >
                    <strong>{role.name}</strong>
                    <span className="d-block" style={{ fontSize: 13 }}>
                      {role.staff_count} staff · {role.permissions.length} permissions
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="col-lg-8">
          <Card
            title={activeRole ? `${activeRole.name} permissions` : 'Permissions'}
            actions={
              !locked && (
                <button
                  className="btn btn--primary btn--sm"
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (!activeRole) return;
                    setBusy(true);

                    try {
                      const { message } = await apiWithMessage(`/admin/staff/roles/${activeRole.id}/permissions`, {
                        method: 'POST',
                        auth: 'admin',
                        body: { permissions: Array.from(checked) },
                      });
                      toastSuccess(message);
                      await load();
                    } catch (error) {
                      toastError(error instanceof ApiError ? error.message : 'Could not save permissions');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? 'Saving…' : 'Save permissions'}
                </button>
              )
            }
          >
            {activeRole?.name === 'Super Admin' && (
              <div className="alert alert-info">The Super Admin role always holds every permission.</div>
            )}

            {groups.map((group) => (
              <div className="permission-group" key={group.group}>
                <h6 className="permission-group__title">{group.group}</h6>
                <div className="permission-grid">
                  {group.permissions.map((permission) => (
                    <div className="form-check" key={permission.name}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`perm-${permission.name}`}
                        disabled={locked}
                        checked={activeRole?.name === 'Super Admin' || checked.has(permission.name)}
                        onChange={(event) => {
                          setChecked((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(permission.name);
                            else next.delete(permission.name);
                            return next;
                          });
                        }}
                      />
                      <label className="form-check-label" htmlFor={`perm-${permission.name}`}>
                        {permission.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
