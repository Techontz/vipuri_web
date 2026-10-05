'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminProviders';
import { Card, DataTable, Field, Modal } from '@/components/admin/ui';
import { ApiError, api, apiWithMessage } from '@/lib/api';
import { formatDate, formatNumber, imageUrl, showAmount } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Pagination as PaginationMeta } from '@/types';

/* ================================== Types ================================= */

type BranchOption = { id: number; name: string; code: string };

type SearchProduct = {
  id: number;
  name: string;
  sku: string | null;
  image: string | null;
  product_type: string;
  variations: { id: number; label: string; sku: string | null }[];
};

type Line = {
  key: string;
  product_id: number;
  variation_id: number;
  name: string;
  variation_label: string | null;
  sku: string | null;
  image: string | null;
  quantity: string;
  unit_cost: string;
  /** On hand at the chosen branch before this receipt; undefined while loading, null if unknown. */
  on_hand?: number | null;
};

type ReceiptSummary = {
  id: number;
  reference: string;
  branch_id: number;
  branch_name: string | null;
  branch_code: string | null;
  supplier_name: string | null;
  supplier_reference: string | null;
  note: string | null;
  received_by: string | null;
  received_at: string | null;
  item_count: number;
  total_quantity: number;
  total_cost: number;
  created_at: string | null;
};

type ReceiptLine = {
  id: number;
  product_id: number;
  product_name: string | null;
  sku: string | null;
  image: string | null;
  variation_id: number;
  variation_label: string | null;
  quantity: number;
  unit_cost: number | null;
  line_cost: number;
  current_stock: number;
};

type ReceiptDetail = ReceiptSummary & { items: ReceiptLine[] };

/** Products that are not physical stock and so cannot be received. */
const NON_STOCK_TYPES = new Set(['grouped', 'external']);

function todayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

const toNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const lineTotal = (line: Line) => (line.unit_cost === '' ? 0 : toNumber(line.quantity) * toNumber(line.unit_cost));

/* ================================= Screen ================================= */

export function StockReceiveScreen() {
  const { admin, can } = useAdmin();
  const [tab, setTab] = useState<'new' | 'recent'>('new');
  const [viewing, setViewing] = useState<number | null>(null);
  const [recentKey, setRecentKey] = useState(0);
  const closeReceipt = useCallback(() => setViewing(null), []);

  const companyWide = Boolean(admin?.is_super_admin || (admin as { is_company_wide?: boolean } | null)?.is_company_wide);

  if (admin && !can('inventory.receive')) {
    return (
      <>
        <AdminPageHeader title="Receive stock" />
        <Card>
          <p className="mb-0">You do not have permission to receive stock. Ask a branch manager or administrator.</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader title="Receive stock">
        <Link href="/admin/inventory" className="btn btn--sm btn-outline--primary">
          Branch inventory
        </Link>
        <Link href="/admin/inventory/history" className="btn btn--sm btn-outline--primary">
          Movement history
        </Link>
      </AdminPageHeader>

      <div className="vp-grn-tabs" role="tablist" aria-label="Receive stock">
        <button type="button" role="tab" aria-selected={tab === 'new'} className={`vp-grn-tab${tab === 'new' ? ' is-active' : ''}`} onClick={() => setTab('new')}>
          <i className="las la-dolly" /> New receipt
        </button>
        <button type="button" role="tab" aria-selected={tab === 'recent'} className={`vp-grn-tab${tab === 'recent' ? ' is-active' : ''}`} onClick={() => setTab('recent')}>
          <i className="las la-history" /> Recent receipts
        </button>
      </div>

      {tab === 'new' ? (
        <NewReceipt
          companyWide={companyWide}
          ownBranch={admin?.branch ?? null}
          onReceived={() => setRecentKey((k) => k + 1)}
          onView={(id) => setViewing(id)}
        />
      ) : (
        <RecentReceipts key={recentKey} companyWide={companyWide} onView={(id) => setViewing(id)} />
      )}

      <ReceiptModal id={viewing} onClose={closeReceipt} />
    </>
  );
}

/* ============================== New receipt =============================== */

function NewReceipt({
  companyWide,
  ownBranch,
  onReceived,
  onView,
}: {
  companyWide: boolean;
  ownBranch: { id: number; name: string; code: string } | null;
  onReceived: () => void;
  onView: (id: number) => void;
}) {
  const { can } = useAdmin();
  const canSeeStock = can('inventory.view');

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [chosenBranchId, setChosenBranchId] = useState('');
  // Branch staff always receive into their own branch; only company-wide staff choose.
  const branchId = companyWide ? chosenBranchId : String(ownBranch?.id ?? '');
  const [details, setDetails] = useState({ supplier_name: '', supplier_reference: '', received_at: todayLocal(), note: '' });
  const [lines, setLines] = useState<Line[]>([]);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<ReceiptDetail | null>(null);

  const searchBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyWide) return;
    api<{ branches: BranchOption[] }>('/admin/branches/options', { auth: 'admin' })
      .then((data) => setBranches(data.branches ?? []))
      .catch(() => undefined);
  }, [companyWide]);

  const branchName = companyWide ? branches.find((b) => String(b.id) === branchId)?.name ?? '' : ownBranch?.name ?? '';

  /* ----------------------------- product search ---------------------------- */

  useEffect(() => {
    const term = search.trim();

    if (!branchId || term.length < 2) return;

    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      setSearching(true);
      api<{ products: SearchProduct[] }>(
        `/admin/inventory/assignable-products?branch_id=${branchId}&search=${encodeURIComponent(term)}`,
        { auth: 'admin', signal: controller.signal },
      )
        .then((data) => {
          setResults((data.products ?? []).filter((p) => !NON_STOCK_TYPES.has(p.product_type)));
          setResultsOpen(true);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          toastError(error instanceof ApiError ? error.message : 'Could not search products');
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search, branchId]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (searchBox.current && !searchBox.current.contains(event.target as Node)) setResultsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  /* ------------------------- on-hand stock per line ------------------------- */

  const loadOnHand = useCallback(
    async (targetBranch: string, productId: number) => {
      if (!canSeeStock || !targetBranch) return null;

      try {
        const data = await api<{ inventory: { variation_id: number; stock_quantity: number; cost_price: number }[] }>(
          `/admin/inventory?branch_id=${targetBranch}&product_id=${productId}&per_page=100`,
          { auth: 'admin' },
        );
        return data.inventory ?? [];
      } catch {
        return null;
      }
    },
    [canSeeStock],
  );

  const applyOnHand = useCallback(
    async (targetBranch: string, productId: number, prefillCost: boolean) => {
      const rows = await loadOnHand(targetBranch, productId);

      setLines((current) =>
        current.map((line) => {
          if (line.product_id !== productId) return line;
          const row = rows?.find((r) => Number(r.variation_id) === line.variation_id);
          const onHand = rows === null ? null : row ? Number(row.stock_quantity) : 0;
          const cost = prefillCost && line.unit_cost === '' && row && Number(row.cost_price) > 0 ? String(Number(row.cost_price)) : line.unit_cost;
          return { ...line, on_hand: onHand, unit_cost: cost };
        }),
      );
    },
    [loadOnHand],
  );

  // A different branch means different on-hand figures for every line.
  const changeBranch = (next: string) => {
    setChosenBranchId(next);
    setResults([]);
    if (!next) return;
    setLines((current) => current.map((l) => ({ ...l, on_hand: canSeeStock ? undefined : null })));
    [...new Set(lines.map((l) => l.product_id))].forEach((id) => void applyOnHand(next, id, false));
  };

  const addLine = (product: SearchProduct, variation?: SearchProduct['variations'][number]) => {
    const variationId = variation?.id ?? 0;
    const key = `${product.id}:${variationId}`;
    const existing = lines.find((l) => l.key === key);

    if (existing) {
      setLines((current) => current.map((l) => (l.key === key ? { ...l, quantity: String(toNumber(l.quantity) + 1) } : l)));
    } else {
      setLines((current) => [
        ...current,
        {
          key,
          product_id: product.id,
          variation_id: variationId,
          name: product.name,
          variation_label: variation?.label ?? null,
          sku: variation?.sku || product.sku,
          image: product.image,
          quantity: '1',
          unit_cost: '',
          on_hand: canSeeStock ? undefined : null,
        },
      ]);
      void applyOnHand(branchId, product.id, true);
    }

    setSearch('');
    setResults([]);
    setResultsOpen(false);
  };

  const updateLine = (key: string, patch: Partial<Line>) => setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const totals = useMemo(
    () => ({
      lines: lines.length,
      units: lines.reduce((sum, l) => sum + Math.max(0, Math.trunc(toNumber(l.quantity))), 0),
      cost: lines.reduce((sum, l) => sum + lineTotal(l), 0),
    }),
    [lines],
  );

  const reset = () => {
    setLines([]);
    setDetails({ supplier_name: '', supplier_reference: '', received_at: todayLocal(), note: '' });
    setDone(null);
  };

  const validate = (): string | null => {
    if (!branchId) return 'Choose the branch this stock is going into';
    if (lines.length === 0) return 'Add at least one product';
    const bad = lines.find((l) => !Number.isInteger(toNumber(l.quantity)) || toNumber(l.quantity) < 1);
    if (bad) return `Enter a quantity of at least 1 for ${bad.name}`;
    const badCost = lines.find((l) => l.unit_cost !== '' && toNumber(l.unit_cost) < 0);
    if (badCost) return `Unit cost for ${badCost.name} cannot be negative`;
    return null;
  };

  const submit = async () => {
    setBusy(true);

    try {
      const { data, message } = await apiWithMessage<{ receipt: ReceiptDetail }>('/admin/inventory/receipts', {
        method: 'POST',
        auth: 'admin',
        body: {
          ...(companyWide ? { branch_id: Number(branchId) } : {}),
          supplier_name: details.supplier_name.trim() || null,
          supplier_reference: details.supplier_reference.trim() || null,
          note: details.note.trim() || null,
          received_at: details.received_at || null,
          items: lines.map((l) => ({
            product_id: l.product_id,
            variation_id: l.variation_id || null,
            quantity: Math.trunc(toNumber(l.quantity)),
            unit_cost: l.unit_cost === '' ? null : toNumber(l.unit_cost),
          })),
        },
      });

      toastSuccess(message);
      setConfirming(false);
      setDone(data.receipt);
      onReceived();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not receive the stock');
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------- success ------------------------------- */

  if (done) {
    return (
      <Card>
        <div className="vp-grn-done">
          <span className="vp-grn-done__icon" aria-hidden="true">
            <i className="las la-check" />
          </span>
          <h4 className="mb-1">Stock received</h4>
          <p className="vp-grn-done__ref">{done.reference}</p>
          <p className="mb-4">
            {formatNumber(done.total_quantity)} unit{done.total_quantity === 1 ? '' : 's'} across {done.item_count} line{done.item_count === 1 ? '' : 's'} added to{' '}
            <strong>{done.branch_name}</strong>
            {done.supplier_name ? ` from ${done.supplier_name}` : ''}
            {done.total_cost > 0 && (
              <>
                {' · '}
                <span className="vp-nowrap">{showAmount(done.total_cost)}</span>
              </>
            )}
          </p>
          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <button type="button" className="btn btn--primary" onClick={reset}>
              <i className="las la-plus" /> Receive more
            </button>
            <button type="button" className="btn btn-outline--primary" onClick={() => onView(done.id)}>
              <i className="las la-file-alt" /> View receipt
            </button>
            <Link href={`/admin/inventory?branch_id=${done.branch_id}`} className="btn btn-outline--primary">
              Branch stock
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  /* -------------------------------- form --------------------------------- */

  return (
    <form
      className="vp-grn"
      onSubmit={(event) => {
        event.preventDefault();
        const problem = validate();
        if (problem) {
          toastError(problem);
          return;
        }
        setConfirming(true);
      }}
    >
      <Card title="Delivery">
        <div className="row">
          {companyWide ? (
            <Field label="Receive into branch" required className="col-lg-4 col-md-6">
              <select className="form-select" required value={branchId} onChange={(event) => changeBranch(event.target.value)}>
                <option value="">Choose a branch</option>
                {branches.map((branch) => (
                  <option value={branch.id} key={branch.id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div className="form-group col-lg-4 col-md-6">
              <label className="form-label">Receive into branch</label>
              <div className="vp-grn-branch">
                <i className="las la-store" aria-hidden="true" />
                <span>
                  <strong>{ownBranch?.name ?? 'No branch assigned'}</strong>
                  <small>Stock you receive goes to your branch.</small>
                </span>
              </div>
            </div>
          )}
          <Field label="Supplier" className="col-lg-4 col-md-6">
            <input
              className="form-control"
              placeholder="e.g. Toyota Tsusho"
              maxLength={191}
              value={details.supplier_name}
              onChange={(event) => setDetails((c) => ({ ...c, supplier_name: event.target.value }))}
            />
          </Field>
          <Field label="Supplier invoice / ref." className="col-lg-2 col-md-6">
            <input
              className="form-control"
              placeholder="INV-0001"
              maxLength={191}
              value={details.supplier_reference}
              onChange={(event) => setDetails((c) => ({ ...c, supplier_reference: event.target.value }))}
            />
          </Field>
          <Field label="Date received" className="col-lg-2 col-md-6">
            <input
              className="form-control"
              type="date"
              max={todayLocal()}
              value={details.received_at}
              onChange={(event) => setDetails((c) => ({ ...c, received_at: event.target.value }))}
            />
          </Field>
          <Field label="Note" className="col-12">
            <input
              className="form-control"
              placeholder="Optional — delivery condition, driver, anything worth keeping"
              maxLength={2000}
              value={details.note}
              onChange={(event) => setDetails((c) => ({ ...c, note: event.target.value }))}
            />
          </Field>
        </div>
      </Card>

      <Card title="Items" className="mt-4" actions={lines.length > 0 ? <span className="vp-grn-count">{lines.length} line{lines.length === 1 ? '' : 's'}</span> : undefined}>
        <div className="vp-grn-search" ref={searchBox}>
          <i className="las la-search" aria-hidden="true" />
          <input
            className="form-control"
            placeholder={branchId ? 'Search by product name or SKU to add a line' : 'Choose a branch first'}
            disabled={!branchId}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => results.length > 0 && setResultsOpen(true)}
            aria-label="Search products"
          />
          {searching && <span className="vp-grn-search__spin spinner-border spinner-border-sm" aria-hidden="true" />}

          {resultsOpen && search.trim().length >= 2 && !searching && (
            <ul className="vp-grn-results" role="listbox">
              {results.length === 0 ? (
                <li className="vp-grn-results__empty">No stocked products match “{search.trim()}”</li>
              ) : (
                results.map((product) => (
                  <li key={product.id}>
                    <div className="vp-grn-result">
                      <img src={imageUrl(product.image)} alt="" width={40} height={40} />
                      <span className="vp-grn-result__text">
                        <strong>{product.name}</strong>
                        <small>{product.sku ?? '—'}</small>
                      </span>
                      {product.product_type !== 'variable' && (
                        <button type="button" className="btn btn--sm btn--primary" onClick={() => addLine(product)}>
                          Add
                        </button>
                      )}
                    </div>
                    {product.product_type === 'variable' && (
                      <div className="vp-grn-variations">
                        {product.variations.length === 0 ? (
                          <small>No variations set up yet</small>
                        ) : (
                          product.variations.map((variation) => (
                            <button type="button" key={variation.id} className="btn btn--sm btn-outline--primary" onClick={() => addLine(product, variation)}>
                              {variation.label || variation.sku || `Variation #${variation.id}`}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="vp-grn-empty">
            <i className="las la-boxes" aria-hidden="true" />
            <p className="mb-0">No items yet. Search above and add each product on the delivery note.</p>
          </div>
        ) : (
          <div className="vp-grn-lines">
            <div className="vp-grn-line vp-grn-line--head" aria-hidden="true">
              <span>Product</span>
              <span>Qty</span>
              <span>Unit cost</span>
              <span className="text-end">Line total</span>
              <span />
            </div>
            {lines.map((line) => {
              const qty = Math.max(0, Math.trunc(toNumber(line.quantity)));
              return (
                <div className="vp-grn-line" key={line.key}>
                  <div className="vp-grn-line__product">
                    <img src={imageUrl(line.image)} alt="" width={44} height={44} />
                    <span>
                      <strong>{line.name}</strong>
                      <small>
                        {line.sku ?? '—'}
                        {line.variation_label ? ` · ${line.variation_label}` : ''}
                      </small>
                      {line.on_hand !== null && (
                        <small className="vp-grn-onhand">
                          {line.on_hand === undefined ? (
                            'Checking stock…'
                          ) : (
                            <>
                              On hand {formatNumber(line.on_hand)} → <strong>{formatNumber(line.on_hand + qty)}</strong>
                              {line.on_hand === 0 ? ' · new at this branch' : ''}
                            </>
                          )}
                        </small>
                      )}
                    </span>
                  </div>
                  <label className="vp-grn-line__field">
                    <span className="vp-grn-line__label">Qty</span>
                    <input
                      className="form-control"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      required
                      value={line.quantity}
                      onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                      aria-label={`Quantity of ${line.name}`}
                    />
                  </label>
                  <label className="vp-grn-line__field">
                    <span className="vp-grn-line__label">Unit cost</span>
                    <input
                      className="form-control"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      placeholder="Optional"
                      value={line.unit_cost}
                      onChange={(event) => updateLine(line.key, { unit_cost: event.target.value })}
                      aria-label={`Unit cost of ${line.name}`}
                    />
                  </label>
                  <span className="vp-grn-line__total">{line.unit_cost === '' ? '—' : showAmount(lineTotal(line))}</span>
                  <button
                    type="button"
                    className="vp-grn-line__remove"
                    onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                    aria-label={`Remove ${line.name}`}
                    title="Remove"
                  >
                    <i className="las la-times" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="vp-grn-footer">
          <dl className="vp-grn-totals">
            <div>
              <dt>Lines</dt>
              <dd>{totals.lines}</dd>
            </div>
            <div>
              <dt>Units</dt>
              <dd>{formatNumber(totals.units)}</dd>
            </div>
            <div>
              <dt>Total cost</dt>
              <dd>{showAmount(totals.cost)}</dd>
            </div>
          </dl>
          <button className="btn btn--primary btn--lg" type="submit" disabled={busy || lines.length === 0 || !branchId}>
            <i className="las la-check-circle" /> Receive stock
          </button>
        </div>
      </Card>

      <Modal open={confirming} title="Confirm receipt" onClose={() => !busy && setConfirming(false)}>
        <p>
          Add <strong>{formatNumber(totals.units)}</strong> unit{totals.units === 1 ? '' : 's'} ({totals.lines} line{totals.lines === 1 ? '' : 's'}) to{' '}
          <strong>{branchName || 'the selected branch'}</strong>?
        </p>
        <dl className="vp-grn-confirm">
          <div>
            <dt>Supplier</dt>
            <dd>{details.supplier_name.trim() || '—'}</dd>
          </div>
          <div>
            <dt>Invoice / ref.</dt>
            <dd>{details.supplier_reference.trim() || '—'}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{details.received_at ? formatDate(details.received_at) : 'Today'}</dd>
          </div>
          <div>
            <dt>Total cost</dt>
            <dd>{showAmount(totals.cost)}</dd>
          </div>
        </dl>
        <ul className="vp-grn-confirm__lines">
          {lines.map((l) => (
            <li key={l.key}>
              <span>
                {l.name}
                {l.variation_label ? ` · ${l.variation_label}` : ''}
              </span>
              <strong>× {Math.trunc(toNumber(l.quantity))}</strong>
            </li>
          ))}
        </ul>
        <p className="vp-grn-confirm__warn">
          <i className="las la-info-circle" aria-hidden="true" /> Stock goes on hand immediately and the receipt cannot be edited afterwards — correct mistakes with a stock adjustment.
        </p>
        <div className="d-flex gap-2 mt-3 flex-wrap">
          <button className="btn btn--primary" type="button" disabled={busy} onClick={submit}>
            {busy ? 'Receiving…' : 'Yes, receive stock'}
          </button>
          <button className="btn btn-outline--primary" type="button" disabled={busy} onClick={() => setConfirming(false)}>
            Go back
          </button>
        </div>
      </Modal>
    </form>
  );
}

/* ============================ Recent receipts ============================= */

function RecentReceipts({ companyWide, onView }: { companyWide: boolean; onView: (id: number) => void }) {
  const [rows, setRows] = useState<ReceiptSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!companyWide) return;
    api<{ branches: BranchOption[] }>('/admin/branches/options', { auth: 'admin' })
      .then((data) => setBranches(data.branches ?? []))
      .catch(() => undefined);
  }, [companyWide]);

  const requestKey = `${page}|${branchId}|${term}`;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    const controller = new AbortController();

    const query = new URLSearchParams({ page: String(page) });
    if (branchId) query.set('branch_id', branchId);
    if (term) query.set('search', term);

    api<{ receipts: ReceiptSummary[]; pagination: PaginationMeta }>(`/admin/inventory/receipts?${query.toString()}`, {
      auth: 'admin',
      signal: controller.signal,
    })
      .then((data) => {
        setRows(data.receipts ?? []);
        setPagination(data.pagination ?? null);
      })
      .catch((error) => {
        if (!controller.signal.aborted) toastError(error instanceof ApiError ? error.message : 'Could not load receipts');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(`${page}|${branchId}|${term}`);
      });

    return () => controller.abort();
  }, [page, branchId, term]);

  return (
    <Card>
      <div className="admin-filter-bar">
        {companyWide && (
          <div className="form-group">
            <label className="form-label">Branch</label>
            <select
              className="form-select"
              value={branchId}
              onChange={(event) => {
                setBranchId(event.target.value);
                setPage(1);
              }}
            >
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
          <label className="form-label">Search</label>
          <input className="form-control" placeholder="GRN number, supplier or invoice" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      <DataTable
        rows={rows}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        rowKey={(row) => row.id}
        empty={term ? 'No receipts match your search' : 'No stock has been received yet'}
        columns={[
          {
            key: 'ref',
            label: 'Receipt',
            nowrap: true,
            render: (row) => (
              <>
                <button type="button" className="vp-grn-link" onClick={() => onView(row.id)}>
                  {row.reference}
                </button>
                <span className="d-block" style={{ fontSize: 13 }}>
                  {formatDate(row.received_at, true)}
                </span>
              </>
            ),
          },
          ...(companyWide ? [{ key: 'branch', label: 'Branch', render: (row: ReceiptSummary) => row.branch_name ?? '—' }] : []),
          {
            key: 'supplier',
            label: 'Supplier',
            render: (row) => (
              <>
                {row.supplier_name ?? '—'}
                {row.supplier_reference && (
                  <span className="d-block" style={{ fontSize: 13 }}>
                    Inv. {row.supplier_reference}
                  </span>
                )}
              </>
            ),
          },
          { key: 'lines', label: 'Lines', align: 'end', render: (row) => row.item_count },
          { key: 'units', label: 'Units', align: 'end', render: (row) => <strong>{formatNumber(row.total_quantity)}</strong> },
          { key: 'cost', label: 'Total cost', align: 'end', nowrap: true, render: (row) => (row.total_cost > 0 ? showAmount(row.total_cost) : '—') },
          { key: 'by', label: 'Received by', render: (row) => row.received_by ?? '—' },
          {
            key: 'actions',
            label: 'Action',
            align: 'end',
            render: (row) => (
              <button type="button" className="btn btn--sm btn-outline--primary" onClick={() => onView(row.id)}>
                View
              </button>
            ),
          },
        ]}
      />
    </Card>
  );
}

/* ============================== Detail modal ============================== */

function ReceiptModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const [loaded, setLoaded] = useState<ReceiptDetail | null>(null);
  // Only show the receipt that was asked for, never the previous one while the next loads.
  const receipt = loaded && loaded.id === id ? loaded : null;

  useEffect(() => {
    if (id === null) return;

    const controller = new AbortController();

    api<{ receipt: ReceiptDetail }>(`/admin/inventory/receipts/${id}`, { auth: 'admin', signal: controller.signal })
      .then((data) => setLoaded(data.receipt))
      .catch((error) => {
        if (controller.signal.aborted) return;
        toastError(error instanceof ApiError ? error.message : 'Could not load the receipt');
        onClose();
      });

    return () => controller.abort();
  }, [id, onClose]);

  return (
    <Modal open={id !== null} title={receipt?.reference ?? 'Stock receipt'} onClose={onClose} size="lg">
      {!receipt ? (
        <div className="vp-skeleton vp-skeleton--line" />
      ) : (
        <>
          <dl className="vp-grn-confirm vp-grn-confirm--detail">
            <div>
              <dt>Branch</dt>
              <dd>{receipt.branch_name}</dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>{formatDate(receipt.received_at, true)}</dd>
            </div>
            <div>
              <dt>Supplier</dt>
              <dd>{receipt.supplier_name ?? '—'}</dd>
            </div>
            <div>
              <dt>Invoice / ref.</dt>
              <dd>{receipt.supplier_reference ?? '—'}</dd>
            </div>
            <div>
              <dt>Received by</dt>
              <dd>{receipt.received_by ?? '—'}</dd>
            </div>
            <div>
              <dt>Total cost</dt>
              <dd>{receipt.total_cost > 0 ? showAmount(receipt.total_cost) : '—'}</dd>
            </div>
          </dl>
          {receipt.note && <p className="vp-grn-note">{receipt.note}</p>}

          <div className="table-responsive">
            <table className="table table--light style--two vp-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Unit cost</th>
                  <th className="text-end">Line cost</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Product">
                      <span className="vp-cell">
                        <span className="d-flex align-items-center gap-2">
                          <img src={imageUrl(item.image)} alt="" width={36} height={36} style={{ borderRadius: 6, objectFit: 'cover' }} />
                          <span>
                            <strong>{item.product_name}</strong>
                            <span className="d-block" style={{ fontSize: 13 }}>
                              {item.sku ?? '—'}
                              {item.variation_label ? ` · ${item.variation_label}` : ''} · now {formatNumber(item.current_stock)} on hand
                            </span>
                          </span>
                        </span>
                      </span>
                    </td>
                    <td data-label="Qty" className="text-end">
                      <span className="vp-cell">
                        <strong>{formatNumber(item.quantity)}</strong>
                      </span>
                    </td>
                    <td data-label="Unit cost" className="text-end vp-nowrap">
                      <span className="vp-cell">{item.unit_cost !== null ? showAmount(item.unit_cost) : '—'}</span>
                    </td>
                    <td data-label="Line cost" className="text-end vp-nowrap">
                      <span className="vp-cell">{item.unit_cost !== null ? showAmount(item.line_cost) : '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total</th>
                  <th className="text-end">{formatNumber(receipt.total_quantity)}</th>
                  <th />
                  <th className="text-end vp-nowrap">{receipt.total_cost > 0 ? showAmount(receipt.total_cost) : '—'}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
