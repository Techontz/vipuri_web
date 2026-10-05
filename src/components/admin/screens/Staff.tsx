'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useAdmin, type AdminMember } from '@/components/admin/AdminProviders';
import { describeAccess } from '@/components/admin/screens/Guide';
import { Card, DataTable, Field, Modal, StatusBadge } from '@/components/admin/ui';
import { ApiError, api, apiWithMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Pagination as PaginationMeta } from '@/types';

/** The permission that makes a role company-wide (see backend Roles::COMPANY_WIDE). */
const COMPANY_WIDE = 'branch.all';
const SUPER_ADMIN = 'Super Admin';

type RoleOption = { name: string; description: string | null; level: number; company_wide: boolean };

type RoleRow = RoleOption & {
  id: number;
  is_builtin: boolean;
  can_edit: boolean;
  permissions: string[];
  staff_count: number;
};

type PermissionGroup = { group: string; permissions: { name: string; label: string }[] };

type BranchOption = { id: number; name: string; code: string };

/** Every message an API failure carries, field errors first. */
function errorMessages(error: unknown, fallback: string): string[] {
  if (error instanceof ApiError) {
    const fields = Object.values(error.errors ?? {}).flat();
    return fields.length ? fields : [error.message];
  }

  return [fallback];
}

function ScopeBadge({ companyWide }: { companyWide: boolean }) {
  return (
    <span className={`vp-scope-badge${companyWide ? ' vp-scope-badge--all' : ''}`}>
      <i className={companyWide ? 'las la-globe-africa' : 'las la-store'} aria-hidden="true" />{' '}
      {companyWide ? 'All branches' : 'One branch'}
    </span>
  );
}

function FormErrors({ messages }: { messages: string[] }) {
  if (!messages.length) return null;

  return (
    <div className="vp-form-errors" role="alert">
      <i className="las la-exclamation-circle" aria-hidden="true" />
      <ul>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

/* ======================================================================== *
 | Staff
 * ======================================================================== */

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

type StaffPayload = {
  staff: AdminMember[];
  pagination: PaginationMeta | null;
  roles: string[];
  role_options: RoleOption[];
};

/**
 * Staff management. Everyone can only manage people ranked below them, inside
 * their own branch unless their role is company-wide. The API enforces all of
 * it; the screen explains it and hides what would only be refused.
 */
export function StaffScreen() {
  const { can, isSuperAdmin, isCompanyWide, roleLevel, admin } = useAdmin();

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [reload, setReload] = useState(0);

  const query = `/admin/staff?page=${page}&search=${encodeURIComponent(search)}&role=${encodeURIComponent(roleFilter)}`;
  const requestKey = `${query}#${reload}`;
  const [result, setResult] = useState<(StaffPayload & { key: string }) | null>(null);
  const loading = result?.key !== requestKey;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMember | null>(null);
  const [form, setForm] = useState({ ...EMPTY_STAFF });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    api<StaffPayload>(query, { auth: 'admin' })
      .then((data) => {
        if (!active) return;
        setResult({
          key: requestKey,
          staff: data.staff ?? [],
          pagination: data.pagination ?? null,
          roles: data.roles ?? [],
          role_options: data.role_options ?? [],
        });
      })
      .catch((error) => {
        if (!active) return;
        toastError(error instanceof ApiError ? error.message : 'Could not load staff');
        setResult((current) => ({
          key: requestKey,
          staff: [],
          pagination: null,
          roles: current?.roles ?? [],
          role_options: current?.role_options ?? [],
        }));
      });

    return () => {
      active = false;
    };
  }, [query, requestKey]);

  useEffect(() => {
    // Branch staff never choose a branch, so they never need the list.
    if (!isCompanyWide) return;

    api<{ branches: BranchOption[] }>('/admin/branches/options', { auth: 'admin' })
      .then((data) => setBranches(data.branches ?? []))
      .catch(() => undefined);
  }, [isCompanyWide]);

  const staff = result?.staff ?? [];
  const roleOptions = useMemo(() => result?.role_options ?? [], [result]);
  const myBranchName = admin?.branch?.name ?? 'your branch';

  /** Why the caller cannot manage this person, or null when they can. */
  const lockReason = (member: AdminMember): string | null => {
    if (!admin) return 'Not signed in';
    if (member.id === admin.id || isSuperAdmin) return null;
    if (member.is_super_admin || (member.role_level ?? 0) >= roleLevel) return 'Ranked at or above you';
    if (!isCompanyWide && member.branch_id !== admin.branch_id) return 'Another branch';
    return null;
  };

  const optionsForForm = useMemo(() => {
    // Someone being edited may hold a role the caller can't hand out (e.g.
    // their own); keep it selectable as the current value.
    if (editing?.role && !roleOptions.some((option) => option.name === editing.role)) {
      return [
        { name: editing.role, description: null, level: editing.role_level ?? 0, company_wide: Boolean(editing.is_company_wide) },
        ...roleOptions,
      ];
    }

    return roleOptions;
  }, [editing, roleOptions]);

  const chosenRole = optionsForForm.find((option) => option.name === form.role) ?? null;
  const chosenIsCompanyWide = Boolean(chosenRole?.company_wide);
  const editingSelf = Boolean(editing && admin && editing.id === admin.id);

  const openCreate = () => {
    setEditing(null);
    setFormErrors([]);
    setForm({ ...EMPTY_STAFF });
    setModalOpen(true);
  };

  const openEdit = (member: AdminMember) => {
    setEditing(member);
    setFormErrors([]);
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

    if (isCompanyWide && !editingSelf && !chosenIsCompanyWide && !form.branch_id) {
      setFormErrors([`Choose a branch: ${form.role || 'this role'} works in one branch.`]);
      return;
    }

    setBusy(true);
    setFormErrors([]);

    try {
      const body: Record<string, unknown> = { ...form };

      if (!form.password) {
        delete body.password;
        delete body.password_confirmation;
      }

      if (editingSelf) delete body.role;

      // Branch staff can only place people in their own branch — the API
      // decides that, so nothing is sent. Company-wide staff always send
      // their choice; null means "all branches" for a company-wide role.
      if (isCompanyWide) body.branch_id = form.branch_id ? Number(form.branch_id) : null;
      else delete body.branch_id;

      const { message } = await apiWithMessage(editing ? `/admin/staff/${editing.id}` : '/admin/staff', {
        method: 'POST',
        auth: 'admin',
        body,
      });

      toastSuccess(message);
      setModalOpen(false);
      setReload((value) => value + 1);
    } catch (error) {
      const messages = errorMessages(error, 'Could not save the staff member');
      setFormErrors(messages);
      toastError(messages[0]);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (member: AdminMember) => {
    try {
      const { message } = await apiWithMessage(`/admin/staff/${member.id}/status`, {
        method: 'POST',
        auth: 'admin',
        body: {},
      });
      toastSuccess(message);
      setReload((value) => value + 1);
    } catch (error) {
      toastError(errorMessages(error, 'Could not change the status')[0]);
    }
  };

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <>
      <AdminPageHeader title="Staff">
        <Link className="btn btn-outline--primary btn--sm" href="/admin/staff/roles">
          <i className="las la-user-tag" /> Roles &amp; permissions
        </Link>
        {can('staff.create') && (
          <button className="btn btn--primary btn--sm" type="button" onClick={openCreate}>
            <i className="las la-plus" /> Add staff
          </button>
        )}
      </AdminPageHeader>

      <div className="vp-rank-note">
        <i className="las la-level-down-alt" aria-hidden="true" />
        <p className="mb-0">
          {isSuperAdmin ? (
            <>As a super admin you can manage everyone, in every branch.</>
          ) : (
            <>
              You are <strong>{admin?.role}</strong> (rank {roleLevel}). You can manage staff ranked below {roleLevel}
              {isCompanyWide ? ' in any branch' : <> in <strong>{myBranchName}</strong></>}. Rows you can&apos;t change are
              marked with a lock.
            </>
          )}{' '}
          <Link href="/admin/guide#add-staff">How adding staff works</Link>
        </p>
      </div>

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label" htmlFor="staff-search">Search</label>
            <input
              id="staff-search"
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
            <label className="form-label" htmlFor="staff-role">Role</label>
            <select
              id="staff-role"
              className="form-select"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All roles</option>
              {(result?.roles ?? []).map((role) => (
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
          pagination={result?.pagination ?? null}
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
                  {member.id === admin?.id && <span className="vp-you-badge ms-1">You</span>}
                  <span className="d-block" style={{ fontSize: 13 }}>
                    {member.email}
                  </span>
                </>
              ),
            },
            {
              key: 'role',
              label: 'Role',
              render: (member) => (
                <>
                  <span className="badge badge--primary">{member.role ?? 'No role'}</span>
                  {member.role_level !== undefined && <span className="vp-rank-chip">Rank {member.role_level}</span>}
                </>
              ),
            },
            {
              key: 'access',
              label: 'Can',
              render: (member) => {
                const items = describeAccess(member.permissions ?? [], member.is_super_admin);
                if (member.is_super_admin) return <span className="vp-access-summary">Everything</span>;
                if (!items.length) return <span className="vp-access-summary text-muted">View only</span>;

                return (
                  <span className="vp-access-summary" title={items.map((item) => item.label).join(', ')}>
                    {items
                      .filter((item) => item.key !== COMPANY_WIDE)
                      .slice(0, 3)
                      .map((item) => item.label)
                      .join(' · ')}
                    {items.length > 3 && <em> +{items.length - 3} more</em>}
                  </span>
                );
              },
            },
            {
              key: 'branch',
              label: 'Branch',
              render: (member) =>
                member.is_company_wide || member.is_super_admin ? (
                  <ScopeBadge companyWide />
                ) : (
                  member.branch?.name ?? '—'
                ),
            },
            { key: 'last_login', label: 'Last login', render: (member) => (member.last_login_at ? formatDate(member.last_login_at, true) : 'Never') },
            { key: 'status', label: 'Status', render: (member) => <StatusBadge active={member.status} /> },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (member) => {
                const locked = lockReason(member);

                if (locked) {
                  return (
                    <span className="vp-locked" title="Only someone ranked above them can change this account">
                      <i className="las la-lock" aria-hidden="true" /> {locked}
                    </span>
                  );
                }

                return (
                  <div className="d-flex gap-2 justify-content-end flex-wrap">
                    {can('staff.update') && (
                      <button className="btn btn--sm btn-outline--primary" type="button" onClick={() => openEdit(member)}>
                        Edit
                      </button>
                    )}
                    {can('staff.status') && member.id !== admin?.id && (
                      <button
                        className={`btn btn--sm ${member.status ? 'btn-outline--warning' : 'btn-outline--success'}`}
                        type="button"
                        onClick={() => void toggleStatus(member)}
                      >
                        {member.status ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} title={editing ? `Edit ${editing.name}` : 'Add staff'} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={submit}>
          <FormErrors messages={formErrors} />

          <div className="row">
            <Field label="Full name" required>
              <input className="form-control" required value={form.name} onChange={update('name')} />
            </Field>
            <Field label="Username" required hint="Used to sign in at /admin/login. Letters, numbers, dot, dash or underscore.">
              <input className="form-control" required value={form.username} onChange={update('username')} autoComplete="off" />
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

            <div className="form-group col-md-6">
              <label className="form-label" htmlFor="staff-form-role">
                Role <span className="text--danger">*</span>
              </label>
              <select
                id="staff-form-role"
                className="form-select"
                required
                value={form.role}
                onChange={update('role')}
                disabled={editingSelf}
              >
                <option value="">Choose a role</option>
                {optionsForForm.map((option) => (
                  <option value={option.name} key={option.name}>
                    {option.name} — rank {option.level}
                    {option.company_wide ? ' · all branches' : ''}
                  </option>
                ))}
              </select>
              <small className="d-block mt-1 text-muted">
                {editingSelf
                  ? 'Nobody can change their own role.'
                  : chosenRole?.description ?? `You can give out roles ranked below your own (${roleLevel}).`}
              </small>
            </div>

            <div className="form-group col-md-6">
              <label className="form-label" htmlFor="staff-form-branch">
                Branch {isCompanyWide && !chosenIsCompanyWide && !editingSelf && <span className="text--danger">*</span>}
              </label>
              {isCompanyWide && !editingSelf ? (
                <>
                  <select
                    id="staff-form-branch"
                    className="form-select"
                    value={form.branch_id}
                    onChange={update('branch_id')}
                    required={!chosenIsCompanyWide}
                  >
                    <option value="">{chosenIsCompanyWide ? 'All branches (no home branch)' : 'Choose a branch'}</option>
                    {branches.map((branch) => (
                      <option value={branch.id} key={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                  <small className="d-block mt-1 text-muted">
                    {chosenIsCompanyWide
                      ? 'This role works across every branch, so a home branch is optional.'
                      : 'This role works in one branch — they will only see that branch.'}
                  </small>
                </>
              ) : (
                <div className="vp-branch-fixed" id="staff-form-branch">
                  <i className="las la-store" aria-hidden="true" />
                  <div>
                    <strong>{editingSelf ? admin?.branch?.name ?? 'All branches' : editing ? editing.branch?.name ?? myBranchName : myBranchName}</strong>
                    <small className="d-block text-muted">
                      {editingSelf
                        ? 'Your branch is set by someone ranked above you.'
                        : 'You can only add staff to your own branch.'}
                    </small>
                  </div>
                </div>
              )}
            </div>

            <Field label={editing ? 'New password' : 'Password'} required={!editing} hint="At least 8 characters with upper-case, lower-case and a number.">
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

/* ======================================================================== *
 | Roles & Permissions
 * ======================================================================== */

type RolesPayload = {
  roles: RoleRow[];
  permission_groups: PermissionGroup[];
  assignable_roles: string[];
  my_level: number;
  grantable_permissions: string[];
};

const EMPTY_ROLE = { name: '', description: '', level: 20, permissions: [] as string[] };

/**
 * The role ladder. Anyone who can see staff can read it; holders of
 * `role.manage` can add roles ranked below their own and edit those, using
 * only permissions they hold themselves.
 */
export function RolesScreen() {
  const { can, isSuperAdmin, admin } = useAdmin();
  const canManage = can('role.manage');

  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<(RolesPayload & { key: number }) | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loading = result?.key !== reload && !loadError;

  const [viewing, setViewing] = useState<RoleRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_ROLE });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    api<RolesPayload>('/admin/staff/roles', { auth: 'admin' })
      .then((data) => {
        if (!active) return;
        setLoadError(null);
        setResult({
          key: reload,
          roles: data.roles ?? [],
          permission_groups: data.permission_groups ?? [],
          assignable_roles: data.assignable_roles ?? [],
          my_level: data.my_level ?? 0,
          grantable_permissions: data.grantable_permissions ?? [],
        });
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof ApiError ? error.message : 'Could not load roles');
      });

    return () => {
      active = false;
    };
  }, [reload]);

  const roles = result?.roles ?? [];
  const groups = result?.permission_groups ?? [];
  const myLevel = result?.my_level ?? 0;
  const maxLevel = isSuperAdmin ? 99 : Math.max(1, myLevel - 1);
  const grantable = useMemo(() => new Set(result?.grantable_permissions ?? []), [result]);

  const chosen = new Set(form.permissions);
  const companyWideOn = chosen.has(COMPANY_WIDE);

  const setPermission = (name: string, on: boolean) =>
    setForm((current) => {
      const next = new Set(current.permissions);
      if (on) next.add(name);
      else next.delete(name);
      return { ...current, permissions: Array.from(next) };
    });

  const setGroup = (names: string[], on: boolean) =>
    setForm((current) => {
      const next = new Set(current.permissions);
      names.forEach((name) => (on ? next.add(name) : next.delete(name)));
      return { ...current, permissions: Array.from(next) };
    });

  const openCreate = () => {
    setEditing(null);
    setFormErrors([]);
    setForm({ ...EMPTY_ROLE, level: Math.min(20, maxLevel) });
    setFormOpen(true);
  };

  const openEdit = (role: RoleRow) => {
    setEditing(role);
    setFormErrors([]);
    setForm({
      name: role.name,
      description: role.description ?? '',
      level: Math.min(role.level, maxLevel),
      permissions: [...role.permissions],
    });
    setFormOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFormErrors([]);

    try {
      const { message } = await apiWithMessage(editing ? `/admin/staff/roles/${editing.id}` : '/admin/staff/roles', {
        method: 'POST',
        auth: 'admin',
        body: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          level: Number(form.level),
          permissions: form.permissions,
        },
      });

      toastSuccess(message);
      setFormOpen(false);
      setReload((value) => value + 1);
    } catch (error) {
      const messages = errorMessages(error, 'Could not save the role');
      setFormErrors(messages);
      toastError(messages[0]);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (role: RoleRow) => {
    if (!window.confirm(`Delete the role "${role.name}"? This cannot be undone.`)) return;

    try {
      const { message } = await apiWithMessage(`/admin/staff/roles/${role.id}`, { method: 'DELETE', auth: 'admin' });
      toastSuccess(message);
      setReload((value) => value + 1);
    } catch (error) {
      toastError(errorMessages(error, 'Could not delete the role')[0]);
    }
  };

  return (
    <>
      <AdminPageHeader title="Roles & permissions">
        <Link className="btn btn-outline--primary btn--sm" href="/admin/guide#custom-roles">
          <i className="las la-question-circle" /> How roles work
        </Link>
        {canManage && (
          <button className="btn btn--primary btn--sm" type="button" onClick={openCreate}>
            <i className="las la-plus" /> New role
          </button>
        )}
      </AdminPageHeader>

      <div className="vp-rank-note">
        <i className="las la-level-down-alt" aria-hidden="true" />
        <p className="mb-0">
          Every role has a <strong>rank</strong>. Staff can only add and manage people whose role ranks below their own.
          {myLevel > 0 && (
            <>
              {' '}
              Your rank is <strong>{myLevel}</strong>
              {canManage ? <>; new roles you create must rank {maxLevel} or lower.</> : '.'}
            </>
          )}
          {!canManage && ' You can read the roles below; ask an admin to change them.'}
        </p>
      </div>

      {loadError && <div className="alert alert-danger">{loadError}</div>}

      {loading ? (
        <div className="vp-role-list">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="vp-skeleton" style={{ height: 112 }} key={index} />
          ))}
        </div>
      ) : (
        <div className="vp-role-list">
          {roles.map((role) => {
            const everything = role.name === SUPER_ADMIN;
            const mine = role.name === admin?.role;

            return (
              <article className={`vp-role-card card box-shadow3${mine ? ' is-mine' : ''}`} key={role.id}>
                <div className="vp-role-card__rank" aria-label={`Rank ${role.level}`}>
                  <span>Rank</span>
                  <strong>{role.level}</strong>
                </div>

                <div className="vp-role-card__main">
                  <div className="vp-role-card__head">
                    <h6 className="mb-0">{role.name}</h6>
                    <ScopeBadge companyWide={role.company_wide} />
                    <span className={`vp-kind-badge${role.is_builtin ? '' : ' vp-kind-badge--custom'}`}>
                      {role.is_builtin ? 'Built-in' : 'Custom'}
                    </span>
                    {mine && <span className="vp-you-badge">Your role</span>}
                  </div>
                  <p className="vp-role-card__desc">{role.description || 'No description yet.'}</p>
                  <div className="vp-role-card__meta">
                    <span>
                      <i className="las la-user-friends" aria-hidden="true" /> {role.staff_count} staff
                    </span>
                    <span>
                      <i className="las la-key" aria-hidden="true" />{' '}
                      {everything ? 'Every permission — cannot be changed' : `${role.permissions.length} permissions`}
                    </span>
                  </div>
                </div>

                <div className="vp-role-card__actions">
                  {!everything && (
                    <button className="btn btn--sm btn-outline--primary" type="button" onClick={() => setViewing(role)}>
                      View
                    </button>
                  )}
                  {canManage && role.can_edit && (
                    <button className="btn btn--sm btn--primary" type="button" onClick={() => openEdit(role)}>
                      Edit
                    </button>
                  )}
                  {canManage && role.can_edit && !role.is_builtin && (
                    <button className="btn btn--sm btn-outline--danger" type="button" onClick={() => void remove(role)}>
                      Delete
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Read-only view of a role's permissions. */}
      <Modal open={Boolean(viewing)} title={viewing ? `${viewing.name} — what it can do` : ''} onClose={() => setViewing(null)} size="lg">
        {viewing && (
          <>
            <p className="mb-3">
              Rank <strong>{viewing.level}</strong> · <ScopeBadge companyWide={viewing.company_wide} />
            </p>
            {viewing.description && <p>{viewing.description}</p>}
            {groups.map((group) => {
              const held = group.permissions.filter((permission) => viewing.permissions.includes(permission.name));
              if (!held.length) return null;

              return (
                <div className="vp-perm-view" key={group.group}>
                  <h6>{group.group}</h6>
                  <div className="vp-perm-chips">
                    {held.map((permission) => (
                      <span className="vp-perm-chip" key={permission.name}>
                        <i className="las la-check" aria-hidden="true" /> {permission.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {viewing.permissions.length === 0 && <p className="text-muted mb-0">This role holds no permissions yet.</p>}
          </>
        )}
      </Modal>

      {/* Create / edit a role. */}
      <Modal open={formOpen} title={editing ? `Edit ${editing.name}` : 'New role'} onClose={() => setFormOpen(false)} size="xl">
        <form onSubmit={submit} className="vp-role-form">
          <FormErrors messages={formErrors} />

          <div className="row">
            <Field
              label="Role name"
              required
              hint={editing?.is_builtin ? 'Built-in roles keep their name.' : 'e.g. Storekeeper, Cashier, Driver'}
            >
              <input
                className="form-control"
                required
                minLength={2}
                maxLength={60}
                value={form.name}
                disabled={Boolean(editing?.is_builtin)}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>

            <div className="form-group col-md-6">
              <label className="form-label" htmlFor="role-level">
                Rank <span className="text--danger">*</span>
              </label>
              <div className="vp-rank-input">
                <input
                  type="range"
                  min={1}
                  max={maxLevel}
                  value={form.level}
                  aria-label="Rank slider"
                  onChange={(event) => setForm((current) => ({ ...current, level: Number(event.target.value) }))}
                />
                <input
                  id="role-level"
                  className="form-control"
                  type="number"
                  min={1}
                  max={maxLevel}
                  required
                  value={form.level}
                  onChange={(event) => setForm((current) => ({ ...current, level: Number(event.target.value) }))}
                />
              </div>
              <small className="d-block mt-1 text-muted">
                1–{maxLevel}. Staff can only manage people ranked below them, so anyone ranked above {form.level || '…'} can
                manage this role. For reference: Manager 60, HR 50, Sales 20.
              </small>
            </div>

            <Field label="Description" className="col-12" hint="One line shown when someone picks this role for a new staff member.">
              <input
                className="form-control"
                maxLength={255}
                value={form.description}
                placeholder="e.g. Receives deliveries and keeps stock counts right in one branch."
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </Field>
          </div>

          <label className={`vp-company-wide${companyWideOn ? ' is-on' : ''}${grantable.has(COMPANY_WIDE) ? '' : ' is-disabled'}`}>
            <input
              type="checkbox"
              className="form-check-input"
              checked={companyWideOn}
              disabled={!grantable.has(COMPANY_WIDE)}
              onChange={(event) => setPermission(COMPANY_WIDE, event.target.checked)}
              title={grantable.has(COMPANY_WIDE) ? undefined : "You don't hold this permission"}
            />
            <span>
              <strong>
                <i className="las la-globe-africa" aria-hidden="true" /> Works across all branches (company-wide)
              </strong>
              <small className="d-block">
                {companyWideOn
                  ? 'People with this role see every branch and need no home branch.'
                  : 'Off: people with this role belong to one branch and only see that branch.'}
              </small>
            </span>
          </label>

          <h6 className="vp-role-form__heading">Permissions</h6>
          <div className="vp-perm-groups">
            {groups.map((group) => {
              const items = group.permissions.filter((permission) => permission.name !== COMPANY_WIDE);
              const enabled = items.filter((permission) => grantable.has(permission.name)).map((permission) => permission.name);
              if (!items.length) return null;
              const allOn = enabled.length > 0 && enabled.every((name) => chosen.has(name));

              return (
                <div className="vp-perm-group" role="group" aria-label={group.group} key={group.group}>
                  <div className="vp-perm-group__head">
                    <span>{group.group}</span>
                    <label className="vp-perm-group__all">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={allOn}
                        disabled={!enabled.length}
                        onChange={(event) => setGroup(enabled, event.target.checked)}
                      />
                      Select all
                    </label>
                  </div>
                  {items.map((permission) => {
                    const allowed = grantable.has(permission.name);
                    const id = `role-perm-${permission.name}`;

                    return (
                      <div
                        className={`form-check vp-perm-item${allowed ? '' : ' is-disabled'}`}
                        key={permission.name}
                        title={allowed ? undefined : "You don't hold this permission"}
                      >
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={id}
                          disabled={!allowed}
                          checked={chosen.has(permission.name)}
                          onChange={(event) => setPermission(permission.name, event.target.checked)}
                        />
                        <label className="form-check-label" htmlFor={id}>
                          {permission.label}
                          {!allowed && <i className="las la-lock ms-1" aria-label="You don't hold this permission" />}
                        </label>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="vp-role-form__footer">
            <span className="text-muted">
              {form.permissions.length} selected · {companyWideOn ? 'all branches' : 'one branch'}
            </span>
            <div className="d-flex gap-2">
              <button className="btn btn-outline--primary" type="button" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button className="btn btn--primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : editing ? 'Save role' : 'Create role'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
