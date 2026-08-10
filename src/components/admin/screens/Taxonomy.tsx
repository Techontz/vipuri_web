'use client';

import { useCallback, useEffect, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card, DataTable, Field, Modal, StatusBadge } from '@/components/admin/ui';
import { Rating } from '@/components/product/Rating';
import { ApiError, api, apiWithMessage, uploadWithProgress } from '@/lib/api';
import { formatDate, imageUrl } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { CategoryNode, Pagination as PaginationMeta } from '@/types';
import { SingleImagePicker } from '@/components/admin/ImagePicker';

/* ================================ Categories ============================== */

const EMPTY_CATEGORY = {
  name: '',
  parent_id: '',
  description: '',
  position: '0',
  show_in_navbar: true,
  is_top: false,
  is_popular: false,
  status: true,
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
};

/**
 * What `GET /admin/categories` really returns.
 *
 * The shared `CategoryNode` declares a nested `meta` object, but this endpoint
 * sends `meta_title` / `meta_description` / `meta_keywords` flat, and also
 * carries `status` and `position` which the shared type omits. Reading
 * `node.meta.title` against this payload threw before the edit modal could
 * open — which is why Edit appeared to do nothing.
 */
type AdminCategoryNode = Omit<CategoryNode, 'meta' | 'subcategories'> & {
  status: boolean;
  position: number | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  subcategories: AdminCategoryNode[];
};

export function CategoriesScreen() {
  const [tree, setTree] = useState<AdminCategoryNode[]>([]);
  const [flat, setFlat] = useState<{ id: number; name: string; parent_id: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_CATEGORY });
  const [icon, setIcon] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  /** What the category already has stored, shown while editing. */
  const [currentIcon, setCurrentIcon] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  /** Set when the admin asks for a stored image to be cleared on save. */
  const [clearIcon, setClearIcon] = useState(false);
  const [clearImage, setClearImage] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ categories: AdminCategoryNode[]; flat: { id: number; name: string; parent_id: number | null }[] }>(
        '/admin/categories',
        { auth: 'admin' },
      );
      setTree(data.categories ?? []);
      setFlat(data.flat ?? []);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value === '' && key === 'parent_id') return;
        body.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
      });
      if (icon) body.append('icon', icon);
      if (image) body.append('image', image);
      if (clearIcon && !icon) body.append('remove_icon', '1');
      if (clearImage && !image) body.append('remove_image', '1');

      if (icon || image) setUploadPercent(0);

      const { message } = await uploadWithProgress(
        editingId ? `/admin/categories/${editingId}` : '/admin/categories',
        body,
        { auth: 'admin', onProgress: icon || image ? setUploadPercent : undefined },
      );

      toastSuccess(message);
      setModalOpen(false);
      setIcon(null);
      setImage(null);
      setClearIcon(false);
      setClearImage(false);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not save the category');
    } finally {
      setBusy(false);
      setUploadPercent(null);
    }
  };

  /** Parent's name for the listing, from the flat list the endpoint sends. */
  const parentName = (parentId: number | null) =>
    parentId ? (flat.find((row) => row.id === parentId)?.name ?? '—') : '—';

  const renderRows = (nodes: AdminCategoryNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => (
      <tr key={node.id}>
        <td data-label="Image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl(node.icon ?? node.image)}
            alt=""
            width={44}
            height={44}
            style={{ borderRadius: 8, objectFit: 'cover', background: '#f1f3f6', display: 'block' }}
          />
        </td>
        <td data-label="Category">
          <span style={{ paddingLeft: depth * 18 }}>
            {depth > 0 && <i className="las la-level-down-alt me-1" />}
            <strong>{node.name}</strong>
          </span>
          <small className="d-block text-muted">{node.slug}</small>
        </td>
        <td data-label="Parent">{parentName(node.parent_id)}</td>
        <td data-label="Products">{node.products_count ?? 0}</td>
        <td data-label="Navbar">{node.show_in_navbar ? 'Yes' : 'No'}</td>
        <td data-label="Popular">{node.is_popular ? 'Yes' : 'No'}</td>
        <td data-label="Status">
          <StatusBadge active={node.status} />
        </td>
        <td data-label="Action" className="text-end">
          <div className="d-flex gap-2 justify-content-end">
            <button
              className="btn btn--sm btn-outline--primary"
              type="button"
              onClick={() => {
                setEditingId(node.id);
                setCurrentIcon(node.icon);
                setCurrentImage(node.image);
                setClearIcon(false);
                setClearImage(false);
                setIcon(null);
                setImage(null);
                setForm({
                  name: node.name,
                  parent_id: node.parent_id ? String(node.parent_id) : '',
                  description: node.description ?? '',
                  position: String(node.position ?? 0),
                  show_in_navbar: node.show_in_navbar,
                  is_top: node.is_top,
                  is_popular: node.is_popular,
                  status: node.status,
                  meta_title: node.meta_title ?? '',
                  meta_description: node.meta_description ?? '',
                  meta_keywords: node.meta_keywords ?? '',
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
                try {
                  const { message } = await apiWithMessage(`/admin/categories/${node.id}/status`, {
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
              Toggle
            </button>
          </div>
        </td>
      </tr>
    )).concat(nodes.flatMap((node) => (node.subcategories.length ? [renderRows(node.subcategories, depth + 1)] : [])) as never);

  return (
    <>
      <AdminPageHeader title="Categories">
        <button
          className="btn btn--primary btn--sm"
          type="button"
          onClick={() => {
            setEditingId(null);
            setCurrentIcon(null);
            setCurrentImage(null);
            setClearIcon(false);
            setClearImage(false);
            setIcon(null);
            setImage(null);
            setForm({ ...EMPTY_CATEGORY });
            setModalOpen(true);
          }}
        >
          <i className="las la-plus" /> Add category
        </button>
      </AdminPageHeader>

      <Card>
        <div className="table-responsive">
          <table className="table table--light style--two vp-table">
            <thead>
              <tr>
                <th style={{ width: 72 }}>Image</th>
                <th>Category</th>
                <th>Parent</th>
                <th>Products</th>
                <th>Navbar</th>
                <th>Popular</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <div className="vp-skeleton vp-skeleton--line" />
                  </td>
                </tr>
              ) : tree.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty">
                    No categories yet
                  </td>
                </tr>
              ) : (
                renderRows(tree)
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} title={editingId ? 'Edit category' : 'Add category'} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={submit}>
          <div className="row">
            <Field label="Name" required>
              <input className="form-control" required value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
            </Field>
            <Field label="Parent category">
              <select className="form-select" value={form.parent_id} onChange={(event) => setForm((c) => ({ ...c, parent_id: event.target.value }))}>
                <option value="">Top level</option>
                {flat
                  .filter((row) => row.id !== editingId)
                  .map((row) => (
                    <option value={row.id} key={row.id}>
                      {row.parent_id ? '— ' : ''}
                      {row.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Description" className="col-12">
              <input className="form-control" value={form.description} onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))} />
            </Field>
            <SingleImagePicker
              label="Icon"
              currentUrl={clearIcon ? null : currentIcon}
              file={icon}
              onChange={(file) => {
                setIcon(file);
                if (file) setClearIcon(false);
              }}
              onClear={editingId ? () => setClearIcon(true) : undefined}
              progress={uploadPercent}
              hint="Square works best — shown in the category rail. JPG, PNG, GIF or WEBP, up to 5 MB."
            />
            <SingleImagePicker
              label="Banner image"
              currentUrl={clearImage ? null : currentImage}
              file={image}
              onChange={(file) => {
                setImage(file);
                if (file) setClearImage(false);
              }}
              onClear={editingId ? () => setClearImage(true) : undefined}
              hint="Wide banner shown at the top of the category page. Up to 5 MB."
            />
            <Field label="Meta title" className="col-12">
              <input className="form-control" value={form.meta_title} onChange={(event) => setForm((c) => ({ ...c, meta_title: event.target.value }))} />
            </Field>
            <Field label="Meta description" className="col-12">
              <textarea className="form-control" rows={2} value={form.meta_description} onChange={(event) => setForm((c) => ({ ...c, meta_description: event.target.value }))} />
            </Field>

            <div className="col-12 d-flex flex-wrap gap-4 mt-2">
              {(
                [
                  ['show_in_navbar', 'Show in navigation'],
                  ['is_top', 'Top category'],
                  ['is_popular', 'Popular category'],
                  ['status', 'Active'],
                ] as const
              ).map(([key, label]) => (
                <div className="form-check" key={key}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`cat-${key}`}
                    checked={form[key] as boolean}
                    onChange={(event) => setForm((c) => ({ ...c, [key]: event.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor={`cat-${key}`}>
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="d-flex gap-2 mt-4">
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save category'}
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

/* ================================== Brands ================================ */

type BrandRow = {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  is_popular: boolean;
  status: boolean;
  products_count: number;
};

export function BrandsScreen() {
  const [rows, setRows] = useState<BrandRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', is_popular: false, status: true });
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ brands: BrandRow[]; pagination: PaginationMeta }>(
        `/admin/brands?page=${page}&search=${encodeURIComponent(search)}`,
        { auth: 'admin' },
      );
      setRows(data.brands ?? []);
      setPagination(data.pagination ?? null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load brands');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminPageHeader title="Brands">
        <button
          className="btn btn--primary btn--sm"
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm({ name: '', is_popular: false, status: true });
            setModalOpen(true);
          }}
        >
          <i className="las la-plus" /> Add brand
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
          empty="No brands yet"
          columns={[
            {
              key: 'brand',
              label: 'Brand',
              render: (row) => (
                <div className="d-flex align-items-center gap-3">
                  <img src={imageUrl(row.logo)} alt={row.name} width={40} height={40} style={{ objectFit: 'contain' }} />
                  <strong>{row.name}</strong>
                </div>
              ),
            },
            { key: 'products', label: 'Products', align: 'end', render: (row) => row.products_count },
            { key: 'popular', label: 'Popular', render: (row) => (row.is_popular ? 'Yes' : 'No') },
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
                    onClick={() => {
                      setEditingId(row.id);
                      setForm({ name: row.name, is_popular: row.is_popular, status: row.status });
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn--sm btn-outline--warning"
                    type="button"
                    onClick={async () => {
                      const { message } = await apiWithMessage(`/admin/brands/${row.id}/status`, { method: 'POST', auth: 'admin' });
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

      <Modal open={modalOpen} title={editingId ? 'Edit brand' : 'Add brand'} onClose={() => setModalOpen(false)}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);

            try {
              const body = new FormData();
              body.append('name', form.name);
              body.append('is_popular', form.is_popular ? '1' : '0');
              body.append('status', form.status ? '1' : '0');
              if (logo) body.append('logo', logo);

              const { message } = await apiWithMessage(editingId ? `/admin/brands/${editingId}` : '/admin/brands', {
                method: 'POST',
                auth: 'admin',
                body,
              });

              toastSuccess(message);
              setModalOpen(false);
              setLogo(null);
              await load();
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : 'Could not save the brand');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="row">
            <Field label="Name" required className="col-12">
              <input className="form-control" required value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
            </Field>
            <Field label="Logo" className="col-12">
              <input className="form-control" type="file" accept="image/*" onChange={(event) => setLogo(event.target.files?.[0] ?? null)} />
            </Field>
            <div className="col-12 d-flex gap-4">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="brand-popular" checked={form.is_popular} onChange={(event) => setForm((c) => ({ ...c, is_popular: event.target.checked }))} />
                <label className="form-check-label" htmlFor="brand-popular">Popular</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="brand-status" checked={form.status} onChange={(event) => setForm((c) => ({ ...c, status: event.target.checked }))} />
                <label className="form-check-label" htmlFor="brand-status">Active</label>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 mt-4">
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save brand'}
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

/* ================================ Attributes ============================== */

type AttributeRow = {
  id: number;
  name: string;
  control_type: string | null;
  is_global: boolean;
  values: { id: number; name: string; color_code: string | null; is_pre_selected: boolean }[];
};

export function AttributesScreen() {
  const [rows, setRows] = useState<AttributeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<{ name: string; control_type: string; values: { id?: number; name: string; color_code: string; is_pre_selected: boolean }[] }>({
    name: '',
    control_type: 'button',
    values: [{ name: '', color_code: '', is_pre_selected: true }],
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ attributes: AttributeRow[] }>('/admin/attributes', { auth: 'admin' });
      setRows(data.attributes ?? []);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load attributes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <AdminPageHeader title="Attributes">
        <button
          className="btn btn--primary btn--sm"
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm({ name: '', control_type: 'button', values: [{ name: '', color_code: '', is_pre_selected: true }] });
            setModalOpen(true);
          }}
        >
          <i className="las la-plus" /> Add attribute
        </button>
      </AdminPageHeader>

      <Card>
        <DataTable
          rows={rows}
          loading={loading}
          rowKey={(row) => row.id}
          empty="No attributes yet"
          columns={[
            { key: 'name', label: 'Attribute', render: (row) => <strong>{row.name}</strong> },
            { key: 'type', label: 'Control', render: (row) => <span className="badge badge--primary text-capitalize">{row.control_type ?? 'dropdown'}</span> },
            { key: 'values', label: 'Values', render: (row) => row.values.map((value) => value.name).join(', ') },
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
                        name: row.name,
                        control_type: row.control_type ?? 'button',
                        values: row.values.map((value) => ({
                          id: value.id,
                          name: value.name,
                          color_code: value.color_code ?? '',
                          is_pre_selected: value.is_pre_selected,
                        })),
                      });
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn--sm btn-outline--danger"
                    type="button"
                    onClick={async () => {
                      try {
                        const { message } = await apiWithMessage(`/admin/attributes/${row.id}`, { method: 'DELETE', auth: 'admin' });
                        toastSuccess(message);
                        await load();
                      } catch (error) {
                        toastError(error instanceof ApiError ? error.message : 'Could not delete the attribute');
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} title={editingId ? 'Edit attribute' : 'Add attribute'} onClose={() => setModalOpen(false)} size="lg">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);

            try {
              const { message } = await apiWithMessage(editingId ? `/admin/attributes/${editingId}` : '/admin/attributes', {
                method: 'POST',
                auth: 'admin',
                body: form,
              });

              toastSuccess(message);
              setModalOpen(false);
              await load();
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : 'Could not save the attribute');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="row">
            <Field label="Name" required>
              <input className="form-control" required value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
            </Field>
            <Field label="Control type">
              <select className="form-select" value={form.control_type} onChange={(event) => setForm((c) => ({ ...c, control_type: event.target.value }))}>
                <option value="button">Buttons</option>
                <option value="radio">Radio</option>
                <option value="dropdown">Dropdown</option>
                <option value="color">Colour swatch</option>
                <option value="image">Image swatch</option>
              </select>
            </Field>
          </div>

          <h6 className="mt-3">Values</h6>
          {form.values.map((value, index) => (
            <div className="row align-items-end mb-2" key={index}>
              <div className="col-md-5">
                <input
                  className="form-control"
                  placeholder="Value"
                  value={value.name}
                  onChange={(event) =>
                    setForm((c) => {
                      const next = [...c.values];
                      next[index] = { ...next[index], name: event.target.value };
                      return { ...c, values: next };
                    })
                  }
                />
              </div>
              <div className="col-md-3">
                <input
                  className="form-control"
                  type="color"
                  value={value.color_code || '#000000'}
                  onChange={(event) =>
                    setForm((c) => {
                      const next = [...c.values];
                      next[index] = { ...next[index], color_code: event.target.value };
                      return { ...c, values: next };
                    })
                  }
                />
              </div>
              <div className="col-md-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="pre-selected"
                    checked={value.is_pre_selected}
                    onChange={() =>
                      setForm((c) => ({
                        ...c,
                        values: c.values.map((entry, i) => ({ ...entry, is_pre_selected: i === index })),
                      }))
                    }
                  />
                  <label className="form-check-label">Default</label>
                </div>
              </div>
              <div className="col-md-1">
                <button
                  className="btn btn--sm btn-outline--danger"
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, values: c.values.filter((_, i) => i !== index) }))}
                >
                  <i className="las la-times" />
                </button>
              </div>
            </div>
          ))}

          <button
            className="btn btn--sm btn-outline--primary mt-2"
            type="button"
            onClick={() => setForm((c) => ({ ...c, values: [...c.values, { name: '', color_code: '', is_pre_selected: false }] }))}
          >
            <i className="las la-plus" /> Add value
          </button>

          <div className="d-flex gap-2 mt-4">
            <button className="btn btn--primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save attribute'}
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

/* ================================== Reviews =============================== */

type ReviewRow = {
  id: number;
  product_id: number;
  product_name: string | null;
  customer: string | null;
  rating: number;
  review: string | null;
  images: string[];
  status: number;
  reject_reason: string | null;
  reply: string | null;
  created_at: string;
};

export function ReviewsScreen() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [counts, setCounts] = useState<{ pending: number; approved: number; rejected: number }>({ pending: 0, approved: 0, rejected: 0 });
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<ReviewRow | null>(null);
  const [replyText, setReplyText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ reviews: ReviewRow[]; pagination: PaginationMeta; counts: typeof counts }>(
        `/admin/reviews?status=${status}&page=${page}`,
        { auth: 'admin' },
      );
      setRows(data.reviews ?? []);
      setPagination(data.pagination ?? null);
      setCounts(data.counts);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load reviews');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (path: string, body?: Record<string, unknown>) => {
    try {
      const { message } = await apiWithMessage(path, { method: 'POST', auth: 'admin', body });
      toastSuccess(message);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Action failed');
    }
  };

  return (
    <>
      <AdminPageHeader title="Product reviews" />

      <Card>
        <div className="admin-filter-bar">
          {(
            [
              ['pending', `Pending (${counts.pending})`],
              ['approved', `Approved (${counts.approved})`],
              ['rejected', `Rejected (${counts.rejected})`],
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
          empty="No reviews here"
          columns={[
            { key: 'product', label: 'Product', render: (row) => row.product_name },
            { key: 'customer', label: 'Customer', render: (row) => row.customer ?? '—' },
            { key: 'rating', label: 'Rating', render: (row) => <Rating average={row.rating} showCount={false} /> },
            {
              key: 'review',
              label: 'Review',
              render: (row) => (
                <>
                  <span className="d-block">{row.review}</span>
                  {row.reply && (
                    <span className="d-block mt-1" style={{ fontSize: 13 }}>
                      <strong>Reply:</strong> {row.reply}
                    </span>
                  )}
                </>
              ),
            },
            { key: 'date', label: 'Date', render: (row) => formatDate(row.created_at) },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              render: (row) => (
                <div className="d-flex gap-2 justify-content-end flex-wrap">
                  {row.status !== 1 && (
                    <button className="btn btn--sm btn-outline--success" type="button" onClick={() => act(`/admin/reviews/${row.id}/approve`)}>
                      Approve
                    </button>
                  )}
                  {row.status !== 2 && (
                    <button
                      className="btn btn--sm btn-outline--warning"
                      type="button"
                      onClick={() => {
                        const reason = window.prompt('Why is this review rejected?');
                        if (reason) void act(`/admin/reviews/${row.id}/reject`, { reason });
                      }}
                    >
                      Reject
                    </button>
                  )}
                  <button
                    className="btn btn--sm btn-outline--primary"
                    type="button"
                    onClick={() => {
                      setReplyTo(row);
                      setReplyText(row.reply ?? '');
                    }}
                  >
                    Reply
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={Boolean(replyTo)} title="Reply to review" onClose={() => setReplyTo(null)}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!replyTo) return;

            await act(`/admin/reviews/${replyTo.id}/reply`, { comment: replyText });
            setReplyTo(null);
          }}
        >
          <textarea className="form-control" rows={5} required value={replyText} onChange={(event) => setReplyText(event.target.value)} />
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn--primary" type="submit">
              Save reply
            </button>
            <button className="btn btn-outline--primary" type="button" onClick={() => setReplyTo(null)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
