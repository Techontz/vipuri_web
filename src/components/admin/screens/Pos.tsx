'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminProviders';
import { Card, DataTable, OrderStatusBadge } from '@/components/admin/ui';
import { ApiError, api } from '@/lib/api';
import { formatDate, imageUrl, showAmount } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Pagination as PaginationMeta } from '@/types';

/* ================================== Types ================================= */

type PosVariation = {
  id: number;
  name: string;
  sku: string | null;
  price: number;
  original_price: number;
  tax_amount: number;
  price_with_tax: number;
  track_inventory: boolean;
  available: number;
};

type PosProduct = {
  id: number;
  name: string;
  sku: string | null;
  gtin: string | null;
  image: string | null;
  product_type: string;
  unit: string | null;
  price: number;
  original_price: number;
  tax_name: string | null;
  tax_rate: number;
  tax_amount: number;
  price_with_tax: number;
  track_inventory: boolean;
  available: number;
  variations: PosVariation[];
};

type BranchOption = { id: number; name: string; code: string };

type PosContext = {
  branch: BranchOption | null;
  company_wide: boolean;
  can_discount: boolean;
  branches: BranchOption[];
};

type CartLine = {
  key: string;
  product_id: number;
  variation_id: number | null;
  name: string;
  variation: string | null;
  sku: string | null;
  image: string | null;
  quantity: number;
  /** Free stock at the branch; null when the item's stock is not tracked. */
  available: number | null;
  list_price: number;
  /** Unit price before VAT — what the API calls `unit_price`. */
  price: number;
  tax_rate: number;
};

type CustomerOption = { id: number; name: string; email: string | null; mobile: string | null };

type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'bank_transfer';

export type PosReceipt = {
  id: number;
  order_number: string;
  channel: string;
  status: number;
  status_label: string;
  created_at: string;
  company: {
    name: string;
    legal_name: string | null;
    tin: string | null;
    vrn: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    logo: string | null;
  };
  branch: { id: number; name: string; code: string; address: string | null; city: string | null; phone: string | null } | null;
  seller: string | null;
  customer: { id: number | null; name: string; mobile: string | null };
  items: {
    id: number;
    product_id: number;
    name: string;
    sku: string | null;
    variation: string | null;
    quantity: number;
    unit_price: number;
    unit_price_with_tax: number;
    tax: number;
    total: number;
  }[];
  totals: { net: number; tax: number; subtotal: number; discount: number; total: number };
  payment: { method: PaymentMethod | null; label: string | null; reference: string | null; amount_received: number; change_due: number };
  note: string | null;
};

type SaleRow = {
  id: number;
  order_number: string;
  created_at: string;
  branch: string | null;
  seller: string | null;
  customer: string;
  items_count: number;
  total: number;
  payment_method: PaymentMethod | null;
  payment_method_label: string | null;
  status: number;
  status_label: string;
};

type SalesSummary = {
  date: string;
  count: number;
  revenue: number;
  tax: number;
  by_payment_method: Record<string, { label: string; count: number; total: number }>;
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; reference?: string }[] = [
  { value: 'cash', label: 'Cash', icon: 'las la-money-bill-wave' },
  { value: 'mobile_money', label: 'Mobile money', icon: 'las la-mobile-alt', reference: 'Transaction code (e.g. M-Pesa)' },
  { value: 'card', label: 'Card', icon: 'las la-credit-card', reference: 'Card slip / approval code' },
  { value: 'bank_transfer', label: 'Bank transfer', icon: 'las la-university', reference: 'Bank reference' },
];

/* ================================ Helpers ================================= */

const round2 = (value: number) => Math.round(value * 100) / 100;

function lineTax(line: CartLine) {
  return round2((line.price * line.tax_rate) / 100);
}

function lineTotal(line: CartLine) {
  return round2((line.price + lineTax(line)) * line.quantity);
}

/** Banknote-friendly amounts just above the total, for one-tap cash entry. */
function quickCash(total: number): number[] {
  if (total <= 0) return [];
  const steps = [1_000, 5_000, 10_000, 50_000];
  const amounts = new Set<number>([Math.ceil(total)]);

  steps.forEach((step) => amounts.add(Math.ceil(total / step) * step));

  return [...amounts].sort((a, b) => a - b).slice(0, 4);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

/* ================================= Screen ================================= */

export function PosScreen() {
  const [tab, setTab] = useState<'sell' | 'sales'>('sell');
  const [context, setContext] = useState<PosContext | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);

  return (
    <>
      <AdminPageHeader title="Point of Sale">
        <div className="vp-pos-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'sell'} className={tab === 'sell' ? 'active' : ''} onClick={() => setTab('sell')}>
            <i className="las la-cash-register" /> New sale
          </button>
          <button type="button" role="tab" aria-selected={tab === 'sales'} className={tab === 'sales' ? 'active' : ''} onClick={() => setTab('sales')}>
            <i className="las la-receipt" /> Today&apos;s sales
          </button>
        </div>
      </AdminPageHeader>

      {/* Kept mounted so a half-built cart survives a look at today's sales. */}
      <div hidden={tab !== 'sell'}>
        <SellPanel
          context={context}
          branchId={branchId}
          onContext={setContext}
          onBranch={setBranchId}
        />
      </div>
      {tab === 'sales' && <SalesPanel context={context} branchId={branchId} />}
    </>
  );
}

/* ================================ New sale ================================ */

function SellPanel({
  context,
  branchId,
  onContext,
  onBranch,
}: {
  context: PosContext | null;
  branchId: number | null;
  onContext: (context: PosContext) => void;
  onBranch: (id: number | null) => void;
}) {
  const { can } = useAdmin();

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [choosing, setChoosing] = useState<number | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState('');
  const [customerMode, setCustomerMode] = useState<'walk_in' | 'registered'>('walk_in');
  const [walkIn, setWalkIn] = useState({ name: '', mobile: '' });
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [received, setReceived] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState<PosReceipt | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);

  const canDiscount = context?.can_discount ?? can('pos.discount');

  /* ------------------------------ catalogue ------------------------------ */

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);

      try {
        const query = new URLSearchParams({ per_page: '20' });
        if (search.trim()) query.set('search', search.trim());
        if (branchId) query.set('branch_id', String(branchId));

        const data = await api<{ products: PosProduct[]; context: PosContext }>(`/admin/pos/products?${query.toString()}`, {
          auth: 'admin',
          signal: controller.signal,
        });

        setProducts(data.products ?? []);
        onContext(data.context);
        if (!branchId && data.context.company_wide && data.context.branch) onBranch(data.context.branch.id);
      } catch (error) {
        if (controller.signal.aborted) return;
        toastError(errorMessage(error, 'Could not load products'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search, branchId, reloadKey, onContext, onBranch]);

  // "/" jumps to the search box from anywhere on the till.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* --------------------------------- cart -------------------------------- */

  const addToCart = useCallback((product: PosProduct, variation?: PosVariation) => {
    const tracks = variation ? variation.track_inventory : product.track_inventory;
    const available = variation ? variation.available : product.available;

    if (tracks && available <= 0) {
      toastError(`"${product.name}" is out of stock at this branch`);
      return;
    }

    const key = `${product.id}:${variation?.id ?? 0}`;

    setCart((current) => {
      const existing = current.find((line) => line.key === key);

      if (existing) {
        if (existing.available !== null && existing.quantity + 1 > existing.available) {
          toastError(`Only ${existing.available} of "${product.name}" available`);
          return current;
        }

        return current.map((line) => (line.key === key ? { ...line, quantity: line.quantity + 1 } : line));
      }

      return [
        ...current,
        {
          key,
          product_id: product.id,
          variation_id: variation?.id ?? null,
          name: product.name,
          variation: variation?.name ?? null,
          sku: variation?.sku || product.sku,
          image: product.image,
          quantity: 1,
          available: tracks ? available : null,
          list_price: variation ? variation.price : product.price,
          price: variation ? variation.price : product.price,
          tax_rate: product.tax_rate,
        },
      ];
    });

    setChoosing(null);
  }, []);

  const pick = (product: PosProduct) => {
    if (product.variations.length > 0) {
      setChoosing((current) => (current === product.id ? null : product.id));
      return;
    }

    addToCart(product);
  };

  const setQuantity = (key: string, quantity: number) => {
    setCart((current) =>
      current.map((line) => {
        if (line.key !== key) return line;
        const max = line.available ?? Number.MAX_SAFE_INTEGER;
        return { ...line, quantity: Math.max(1, Math.min(max, Math.floor(quantity) || 1)) };
      }),
    );
  };

  const setPrice = (key: string, price: string) => {
    const value = Number(price);
    setCart((current) => current.map((line) => (line.key === key ? { ...line, price: Number.isFinite(value) && value >= 0 ? value : 0 } : line)));
  };

  const removeLine = (key: string) => setCart((current) => current.filter((line) => line.key !== key));

  /* -------------------------------- totals ------------------------------- */

  const totals = useMemo(() => {
    const subtotal = round2(cart.reduce((sum, line) => sum + lineTotal(line), 0));
    const tax = round2(cart.reduce((sum, line) => sum + lineTax(line) * line.quantity, 0));
    const off = canDiscount ? Math.min(subtotal, Math.max(0, Number(discount) || 0)) : 0;
    const total = round2(subtotal - off);
    const items = cart.reduce((sum, line) => sum + line.quantity, 0);

    return { subtotal, tax, discount: off, total, items };
  }, [cart, discount, canDiscount]);

  const cash = Number(received) || 0;
  const change = method === 'cash' ? round2(cash - totals.total) : 0;
  const cashShort = method === 'cash' && cash < totals.total;
  const ready = cart.length > 0 && !busy && !cashShort;

  /* -------------------------------- branch ------------------------------- */

  const changeBranch = (id: number) => {
    if (cart.length > 0 && !window.confirm('Changing the branch empties the current sale. Continue?')) return;
    setCart([]);
    onBranch(id);
  };

  /* -------------------------------- submit ------------------------------- */

  const resetSale = () => {
    setCart([]);
    setDiscount('');
    setCustomerMode('walk_in');
    setWalkIn({ name: '', mobile: '' });
    setCustomer(null);
    setMethod('cash');
    setReceived('');
    setReference('');
    setNote('');
    setShowNote(false);
    setCompleted(null);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const complete = async () => {
    if (!ready || inFlight.current) return;

    inFlight.current = true;
    setBusy(true);

    try {
      const body = {
        branch_id: context?.company_wide ? branchId : undefined,
        customer:
          customerMode === 'registered' && customer
            ? { user_id: customer.id }
            : { name: walkIn.name.trim() || null, mobile: walkIn.mobile.trim() || null },
        items: cart.map((line) => ({
          product_id: line.product_id,
          variation_id: line.variation_id,
          quantity: line.quantity,
          ...(canDiscount && Math.abs(line.price - line.list_price) >= 0.01 ? { unit_price: line.price } : {}),
        })),
        discount: totals.discount > 0 ? totals.discount : undefined,
        payment_method: method,
        amount_received: method === 'cash' ? cash : undefined,
        payment_reference: method !== 'cash' && reference.trim() ? reference.trim() : undefined,
        note: note.trim() || undefined,
      };

      const data = await api<{ order: { id: number; order_number: string }; receipt: PosReceipt }>('/admin/pos/sales', {
        method: 'POST',
        auth: 'admin',
        body,
      });

      setCompleted(data.receipt);
      setReloadKey((key) => key + 1);
      toastSuccess(`Sale ${data.order.order_number} completed`);
    } catch (error) {
      toastError(errorMessage(error, 'The sale could not be completed'));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  // Ctrl/⌘ + Enter completes the sale.
  const completeRef = useRef(complete);
  useEffect(() => {
    completeRef.current = complete;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void completeRef.current();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const printReceipt = (id: number) => {
    window.open(`/admin/pos/receipt/${id}?print=1`, '_blank', 'noopener');
  };

  /* -------------------------------- render ------------------------------- */

  return (
    <div className="vp-pos">
      <section className="vp-pos__catalog card box-shadow3">
        <div className="vp-pos__catalog-head">
          <div className="vp-pos__search">
            <i className="las la-search" aria-hidden />
            <input
              ref={searchRef}
              className="form-control"
              type="search"
              autoFocus
              placeholder="Search name, SKU or barcode"
              aria-label="Search products"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                // Enter adds the top match — scanner-friendly.
                if (event.key === 'Enter' && products.length > 0 && !loading) {
                  event.preventDefault();
                  pick(products[0]);
                  if (products[0].variations.length === 0) setSearch('');
                }
              }}
            />
          </div>

          {context?.company_wide ? (
            <select
              className="form-select vp-pos__branch"
              aria-label="Selling branch"
              value={branchId ?? ''}
              onChange={(event) => changeBranch(Number(event.target.value))}
            >
              {context.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : (
            context?.branch && (
              <span className="vp-pos__branch-badge">
                <i className="las la-store" /> {context.branch.name}
              </span>
            )
          )}
        </div>

        <div className="vp-pos__results" aria-busy={loading}>
          {loading && products.length === 0 ? (
            Array.from({ length: 6 }).map((_, index) => <div key={index} className="vp-skeleton vp-pos__skeleton" />)
          ) : products.length === 0 ? (
            <p className="vp-pos__empty">No products match &ldquo;{search}&rdquo;.</p>
          ) : (
            products.map((product) => {
              const out = product.track_inventory && product.available <= 0;
              const discounted = product.original_price > product.price;

              return (
                <div key={product.id} className={`vp-pos__product ${out ? 'is-out' : ''}`}>
                  <button type="button" className="vp-pos__product-main" onClick={() => pick(product)} disabled={out && product.variations.length === 0}>
                    <img src={imageUrl(product.image)} alt="" width={52} height={52} loading="lazy" />
                    <span className="vp-pos__product-info">
                      <strong>{product.name}</strong>
                      <span className="vp-pos__product-meta">
                        {product.sku && <span>{product.sku}</span>}
                        {product.track_inventory ? (
                          <span className={`vp-pos__stock ${out ? 'out' : product.available <= 3 ? 'low' : ''}`}>
                            {out ? 'Out of stock' : `${product.available} in stock`}
                          </span>
                        ) : (
                          <span className="vp-pos__stock muted">
                            {product.available > 0 ? `${product.available} on shelf` : 'Stock not tracked'}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="vp-pos__product-price">
                      {product.variations.length > 0 && <small>from </small>}
                      <strong>{showAmount(product.variations.length > 0 ? Math.min(...product.variations.map((v) => v.price_with_tax)) : product.price_with_tax)}</strong>
                      {discounted && product.variations.length === 0 && <del>{showAmount(product.original_price + product.tax_amount)}</del>}
                      {product.tax_rate > 0 && <small>incl. {product.tax_name ?? 'VAT'}</small>}
                    </span>
                    <span className="vp-pos__add" aria-hidden>
                      <i className={product.variations.length > 0 ? 'las la-angle-down' : 'las la-plus'} />
                    </span>
                  </button>

                  {choosing === product.id && (
                    <div className="vp-pos__variations">
                      {product.variations.map((variation) => {
                        const vOut = variation.track_inventory && variation.available <= 0;
                        return (
                          <button key={variation.id} type="button" disabled={vOut} onClick={() => addToCart(product, variation)}>
                            <span>{variation.name}</span>
                            <span className={`vp-pos__stock ${vOut ? 'out' : ''}`}>
                              {variation.track_inventory ? (vOut ? 'Out' : `${variation.available} left`) : ''}
                            </span>
                            <strong>{showAmount(variation.price_with_tax)}</strong>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <p className="vp-pos__hint">
          <kbd>/</kbd> search · <kbd>Enter</kbd> add top match · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> complete sale
        </p>
      </section>

      <aside className="vp-pos__cart card box-shadow3" aria-label="Current sale">
        {completed ? (
          <div className="vp-pos__done">
            <span className="vp-pos__done-icon">
              <i className="las la-check" />
            </span>
            <h5>Sale completed</h5>
            <p className="vp-pos__done-number">{completed.order_number}</p>
            <dl className="vp-pos__done-figures">
              <div>
                <dt>Total</dt>
                <dd>{showAmount(completed.totals.total)}</dd>
              </div>
              <div>
                <dt>Paid by</dt>
                <dd>{completed.payment.label}</dd>
              </div>
              {completed.payment.method === 'cash' && (
                <div className="is-change">
                  <dt>Change due</dt>
                  <dd>{showAmount(completed.payment.change_due)}</dd>
                </div>
              )}
            </dl>
            <div className="vp-pos__done-actions">
              <button type="button" className="btn btn--primary btn-lg" onClick={() => printReceipt(completed.id)}>
                <i className="las la-print" /> Print receipt
              </button>
              <button type="button" className="btn btn-outline--primary btn-lg" onClick={resetSale} autoFocus>
                <i className="las la-plus" /> New sale
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="vp-pos__cart-head">
              <h5>Current sale</h5>
              {cart.length > 0 && (
                <button type="button" className="btn btn--sm btn-outline--danger" onClick={() => setCart([])}>
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="vp-pos__cart-empty">
                <i className="las la-shopping-basket" />
                <p>Search for a part and tap it to add it to the sale.</p>
              </div>
            ) : (
              <ul className="vp-pos__lines">
                {cart.map((line) => (
                  <li key={line.key} className="vp-pos__line">
                    <div className="vp-pos__line-top">
                      <span className="vp-pos__line-name">
                        <strong>{line.name}</strong>
                        <small>
                          {[line.variation, line.sku].filter(Boolean).join(' · ')}
                          {line.available !== null ? ` · ${line.available} available` : ''}
                        </small>
                      </span>
                      <button type="button" className="vp-pos__remove" aria-label={`Remove ${line.name}`} onClick={() => removeLine(line.key)}>
                        <i className="las la-times" />
                      </button>
                    </div>
                    <div className="vp-pos__line-bottom">
                      <div className="vp-pos__stepper">
                        <button type="button" aria-label="Decrease quantity" onClick={() => (line.quantity > 1 ? setQuantity(line.key, line.quantity - 1) : removeLine(line.key))}>
                          <i className="las la-minus" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={line.available ?? undefined}
                          aria-label={`Quantity of ${line.name}`}
                          value={line.quantity}
                          onChange={(event) => setQuantity(line.key, Number(event.target.value))}
                        />
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={line.available !== null && line.quantity >= line.available}
                          onClick={() => setQuantity(line.key, line.quantity + 1)}
                        >
                          <i className="las la-plus" />
                        </button>
                      </div>

                      {canDiscount ? (
                        <label className="vp-pos__price-edit">
                          <span>@</span>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            inputMode="decimal"
                            aria-label={`Unit price of ${line.name}${line.tax_rate > 0 ? ' before VAT' : ''}`}
                            value={line.price}
                            onChange={(event) => setPrice(line.key, event.target.value)}
                          />
                          {line.tax_rate > 0 && <small>+{line.tax_rate}% VAT</small>}
                        </label>
                      ) : (
                        <span className="vp-pos__unit">@ {showAmount(round2(line.price + lineTax(line)))}</span>
                      )}

                      <strong className="vp-pos__line-total">{showAmount(lineTotal(line))}</strong>
                    </div>
                    {line.price !== line.list_price && (
                      <small className="vp-pos__price-note">
                        List price {showAmount(line.list_price)}{' '}
                        <button type="button" onClick={() => setPrice(line.key, String(line.list_price))}>
                          reset
                        </button>
                      </small>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="vp-pos__section">
              <div className="vp-pos__segmented" role="radiogroup" aria-label="Customer">
                <button type="button" role="radio" aria-checked={customerMode === 'walk_in'} className={customerMode === 'walk_in' ? 'active' : ''} onClick={() => setCustomerMode('walk_in')}>
                  Walk-in
                </button>
                <button type="button" role="radio" aria-checked={customerMode === 'registered'} className={customerMode === 'registered' ? 'active' : ''} onClick={() => setCustomerMode('registered')}>
                  Registered customer
                </button>
              </div>

              {customerMode === 'walk_in' ? (
                <div className="vp-pos__row">
                  <input className="form-control" placeholder="Name (optional)" aria-label="Customer name" value={walkIn.name} onChange={(event) => setWalkIn({ ...walkIn, name: event.target.value })} maxLength={120} />
                  <input className="form-control" placeholder="Phone (optional)" aria-label="Customer phone" inputMode="tel" value={walkIn.mobile} onChange={(event) => setWalkIn({ ...walkIn, mobile: event.target.value })} maxLength={40} />
                </div>
              ) : (
                <CustomerPicker value={customer} onChange={setCustomer} />
              )}
            </div>

            <div className="vp-pos__totals">
              <div>
                <span>Items</span>
                <span>{totals.items}</span>
              </div>
              <div>
                <span>Subtotal</span>
                <span>{showAmount(totals.subtotal)}</span>
              </div>
              {totals.tax > 0 && (
                <div className="is-muted">
                  <span>VAT included</span>
                  <span>{showAmount(totals.tax)}</span>
                </div>
              )}
              {canDiscount && (
                <div className="vp-pos__discount">
                  <label htmlFor="vp-pos-discount">Discount</label>
                  <input
                    id="vp-pos-discount"
                    className="form-control form-control-sm"
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    placeholder="0"
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                  />
                </div>
              )}
              <div className="vp-pos__grand">
                <span>Total</span>
                <span>{showAmount(totals.total)}</span>
              </div>
            </div>

            <div className="vp-pos__section">
              <div className="vp-pos__methods" role="radiogroup" aria-label="Payment method">
                {PAYMENT_METHODS.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    role="radio"
                    aria-checked={method === entry.value}
                    className={method === entry.value ? 'active' : ''}
                    onClick={() => setMethod(entry.value)}
                  >
                    <i className={entry.icon} />
                    <span>{entry.label}</span>
                  </button>
                ))}
              </div>

              {method === 'cash' ? (
                <>
                  <div className="vp-pos__cash">
                    <label htmlFor="vp-pos-received">Cash received</label>
                    <input
                      id="vp-pos-received"
                      className="form-control"
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      placeholder={String(Math.ceil(totals.total))}
                      value={received}
                      onChange={(event) => setReceived(event.target.value)}
                    />
                  </div>
                  {totals.total > 0 && (
                    <div className="vp-pos__quick">
                      {quickCash(totals.total).map((amount) => (
                        <button key={amount} type="button" onClick={() => setReceived(String(amount))}>
                          {showAmount(amount, { withCurrency: false })}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={`vp-pos__change ${cashShort && received ? 'is-short' : ''}`}>
                    <span>{cashShort ? 'Still due' : 'Change due'}</span>
                    <strong>{showAmount(cashShort ? round2(totals.total - cash) : change)}</strong>
                  </div>
                </>
              ) : (
                <input
                  className="form-control"
                  placeholder={PAYMENT_METHODS.find((entry) => entry.value === method)?.reference}
                  aria-label="Payment reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  maxLength={100}
                />
              )}

              {showNote ? (
                <textarea className="form-control mt-2" rows={2} placeholder="Note for this sale" aria-label="Note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
              ) : (
                <button type="button" className="vp-pos__link mt-2" onClick={() => setShowNote(true)}>
                  <i className="las la-sticky-note" /> Add a note
                </button>
              )}
            </div>

            <button type="button" className="btn btn--primary vp-pos__complete" disabled={!ready} onClick={() => void complete()}>
              {busy ? (
                'Completing…'
              ) : (
                <>
                  <i className="las la-check-circle" /> Complete sale · {showAmount(totals.total)}
                </>
              )}
            </button>
          </>
        )}
      </aside>
    </div>
  );
}

/* ============================ Customer search ============================= */

function CustomerPicker({ value, onChange }: { value: CustomerOption | null; onChange: (customer: CustomerOption | null) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await api<{ customers: CustomerOption[] }>(`/admin/pos/customers?search=${encodeURIComponent(query.trim())}`, {
          auth: 'admin',
          signal: controller.signal,
        });
        setResults(data.customers ?? []);
        setOpen(true);
      } catch (error) {
        if (!controller.signal.aborted) toastError(errorMessage(error, 'Could not search customers'));
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  if (value) {
    return (
      <div className="vp-pos__chosen">
        <span>
          <strong>{value.name}</strong>
          <small>{[value.mobile, value.email].filter(Boolean).join(' · ')}</small>
        </span>
        <button type="button" className="btn btn--sm btn-outline--primary" onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="vp-pos__customer-search">
      <input
        className="form-control"
        placeholder="Search name, phone or email"
        aria-label="Search registered customers"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && query.trim().length >= 2 && (
        <ul className="vp-pos__customer-results">
          {results.length === 0 ? (
            <li className="is-empty">No registered customer found</li>
          ) : (
            results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(result);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <strong>{result.name}</strong>
                  <small>{[result.mobile, result.email].filter(Boolean).join(' · ')}</small>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/* ============================== Today's sales ============================= */

function SalesPanel({ context, branchId }: { context: PosContext | null; branchId: number | null }) {
  const { can } = useAdmin();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [filterBranch, setFilterBranch] = useState<string>(context?.company_wide && branchId ? String(branchId) : '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const query = new URLSearchParams({ page: String(page), date });
        if (filterBranch) query.set('branch_id', filterBranch);

        const data = await api<{ sales: SaleRow[]; summary: SalesSummary; pagination: PaginationMeta }>(`/admin/pos/sales?${query.toString()}`, {
          auth: 'admin',
        });

        if (cancelled) return;
        setSales(data.sales ?? []);
        setSummary(data.summary ?? null);
        setPagination(data.pagination ?? null);
      } catch (error) {
        if (!cancelled) toastError(errorMessage(error, 'Could not load sales'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [page, date, filterBranch]);

  const methods = Object.entries(summary?.by_payment_method ?? {});

  return (
    <>
      <div className="vp-pos-summary">
        <div className="vp-pos-summary__tile is-main">
          <span>Takings</span>
          <strong>{showAmount(summary?.revenue ?? 0)}</strong>
          <small>
            {summary?.count ?? 0} sale{summary?.count === 1 ? '' : 's'}
            {summary?.tax ? ` · VAT ${showAmount(summary.tax)}` : ''}
          </small>
        </div>
        {PAYMENT_METHODS.map((entry) => {
          const figures = methods.find(([key]) => key === entry.value)?.[1];
          return (
            <div className="vp-pos-summary__tile" key={entry.value}>
              <span>
                <i className={entry.icon} /> {entry.label}
              </span>
              <strong>{showAmount(figures?.total ?? 0)}</strong>
              <small>{figures?.count ?? 0} sales</small>
            </div>
          );
        })}
      </div>

      <Card>
        <div className="admin-filter-bar">
          <div className="form-group">
            <label className="form-label" htmlFor="vp-pos-date">
              Date
            </label>
            <input
              id="vp-pos-date"
              className="form-control"
              type="date"
              value={date}
              onChange={(event) => {
                setLoading(true);
                setDate(event.target.value || new Date().toLocaleDateString('en-CA'));
                setPage(1);
              }}
            />
          </div>
          {context?.company_wide && (
            <div className="form-group">
              <label className="form-label" htmlFor="vp-pos-branch-filter">
                Branch
              </label>
              <select
                id="vp-pos-branch-filter"
                className="form-select"
                value={filterBranch}
                onChange={(event) => {
                  setLoading(true);
                  setFilterBranch(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All branches</option>
                {context.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <DataTable
          rows={sales}
          loading={loading}
          pagination={pagination}
          onPageChange={(next) => {
            setLoading(true);
            setPage(next);
          }}
          rowKey={(sale) => sale.id}
          empty="No counter sales on this day yet"
          columns={[
            {
              key: 'number',
              label: 'Sale',
              nowrap: true,
              render: (sale) => (
                <>
                  <strong>{sale.order_number}</strong>
                  <span className="d-block text-muted" style={{ fontSize: 13 }}>
                    {formatDate(sale.created_at, true)}
                  </span>
                </>
              ),
            },
            { key: 'customer', label: 'Customer', render: (sale) => sale.customer },
            ...(context?.company_wide ? [{ key: 'branch', label: 'Branch', render: (sale: SaleRow) => sale.branch ?? '—' }] : []),
            { key: 'seller', label: 'Sold by', render: (sale) => sale.seller ?? '—' },
            { key: 'method', label: 'Payment', nowrap: true, render: (sale) => sale.payment_method_label ?? '—' },
            {
              key: 'status',
              label: 'Status',
              nowrap: true,
              render: (sale) => <OrderStatusBadge status={sale.status} label={sale.status === 4 ? 'Completed' : sale.status_label} />,
            },
            { key: 'total', label: 'Total', align: 'end', nowrap: true, render: (sale) => <strong>{showAmount(sale.total)}</strong> },
            {
              key: 'actions',
              label: 'Action',
              align: 'end',
              nowrap: true,
              render: (sale) => (
                <span className="d-inline-flex gap-1">
                  <Link href={`/admin/pos/receipt/${sale.id}`} className="btn btn--sm btn-outline--primary">
                    <i className="las la-receipt" /> Receipt
                  </Link>
                  {can('order.view') && (
                    <Link href={`/admin/orders/${sale.id}`} className="btn btn--sm btn-outline--primary">
                      Order
                    </Link>
                  )}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}

/* ================================ Receipt ================================= */

/**
 * An 80 mm till receipt. On screen it sits on the page with a toolbar; in
 * print everything but the slip is hidden (see `.vp-receipt-page` in
 * vipuri-admin.css), so the browser's print dialog sends just the receipt.
 */
export function PosReceiptScreen({ id, autoPrint = false }: { id: number; autoPrint?: boolean }) {
  const [receipt, setReceipt] = useState<PosReceipt | null>(null);
  const [failed, setFailed] = useState(false);
  const printed = useRef(false);

  useEffect(() => {
    let cancelled = false;

    api<{ receipt: PosReceipt }>(`/admin/pos/sales/${id}`, { auth: 'admin' })
      .then((data) => {
        if (!cancelled) setReceipt(data.receipt);
      })
      .catch((error) => {
        if (cancelled) return;
        setFailed(true);
        toastError(errorMessage(error, 'Could not load the receipt'));
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    document.body.classList.add('vp-receipt-page');
    return () => document.body.classList.remove('vp-receipt-page');
  }, []);

  useEffect(() => {
    if (!receipt || !autoPrint || printed.current) return;
    printed.current = true;
    // Let the slip paint (and the logo load) before the dialog opens.
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [receipt, autoPrint]);

  if (failed) return <Card>Receipt not found.</Card>;
  if (!receipt) return <div className="vp-skeleton" style={{ height: 420, maxWidth: 340, margin: '0 auto' }} />;

  const { company, branch, totals, payment } = receipt;

  return (
    <>
      <div className="vp-receipt-toolbar">
        <Link href="/admin/pos" className="btn btn--sm btn-outline--primary">
          <i className="las la-arrow-left" /> Back to till
        </Link>
        <button type="button" className="btn btn--sm btn--primary" onClick={() => window.print()}>
          <i className="las la-print" /> Print receipt
        </button>
      </div>

      <article className="vp-receipt" aria-label={`Receipt ${receipt.order_number}`}>
        <header className="vp-receipt__head">
          {company.logo && <img src={company.logo} alt="" className="vp-receipt__logo" />}
          <h1>{company.legal_name || company.name}</h1>
          {branch && (
            <p>
              {branch.name}
              {branch.address ? <><br />{branch.address}</> : null}
              {branch.city ? <><br />{branch.city}</> : null}
            </p>
          )}
          {(branch?.phone || company.phone) && <p>Tel: {branch?.phone || company.phone}</p>}
          {(company.tin || company.vrn) && (
            <p>
              {company.tin && <>TIN: {company.tin}</>}
              {company.tin && company.vrn && <br />}
              {company.vrn && <>VRN: {company.vrn}</>}
            </p>
          )}
        </header>

        <div className="vp-receipt__rule" />

        <dl className="vp-receipt__meta">
          <div><dt>Receipt</dt><dd>{receipt.order_number}</dd></div>
          <div><dt>Date</dt><dd>{formatDate(receipt.created_at, true)}</dd></div>
          <div><dt>Served by</dt><dd>{receipt.seller ?? '—'}</dd></div>
          <div><dt>Customer</dt><dd>{receipt.customer.name}</dd></div>
          {receipt.customer.mobile && <div><dt>Phone</dt><dd>{receipt.customer.mobile}</dd></div>}
        </dl>

        {receipt.status === 6 && <p className="vp-receipt__flag">RETURNED</p>}
        {receipt.status === 7 && <p className="vp-receipt__flag">CANCELLED</p>}

        <div className="vp-receipt__rule" />

        <table className="vp-receipt__items">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.name}
                  {item.variation && <small> ({item.variation})</small>}
                  <small className="d-block">
                    {item.sku ? `${item.sku} · ` : ''}@ {showAmount(item.unit_price_with_tax, { withCurrency: false })}
                  </small>
                </td>
                <td>{item.quantity}</td>
                <td>{showAmount(item.total, { withCurrency: false })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="vp-receipt__rule" />

        <dl className="vp-receipt__totals">
          <div><dt>Subtotal</dt><dd>{showAmount(totals.subtotal)}</dd></div>
          {totals.discount > 0 && <div><dt>Discount</dt><dd>- {showAmount(totals.discount)}</dd></div>}
          <div className="is-grand"><dt>TOTAL</dt><dd>{showAmount(totals.total)}</dd></div>
          <div className="is-small"><dt>Net (excl. VAT)</dt><dd>{showAmount(totals.net)}</dd></div>
          <div className="is-small"><dt>VAT included</dt><dd>{showAmount(totals.tax)}</dd></div>
        </dl>

        <div className="vp-receipt__rule" />

        <dl className="vp-receipt__totals">
          <div><dt>Paid by</dt><dd>{payment.label ?? '—'}</dd></div>
          {payment.reference && <div><dt>Reference</dt><dd>{payment.reference}</dd></div>}
          {payment.method === 'cash' && (
            <>
              <div><dt>Cash received</dt><dd>{showAmount(payment.amount_received)}</dd></div>
              <div><dt>Change</dt><dd>{showAmount(payment.change_due)}</dd></div>
            </>
          )}
        </dl>

        {receipt.note && <p className="vp-receipt__note">{receipt.note}</p>}

        <footer className="vp-receipt__foot">
          <p>Thank you for shopping with {company.name}!</p>
          <p>Goods sold are subject to our returns policy. Keep this receipt.</p>
        </footer>
      </article>
    </>
  );
}
