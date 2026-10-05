'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Pagination } from '@/components/ui/Pagination';
import { useTranslate } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { ApiError, api, apiWithMessage, downloadFile } from '@/lib/api';
import { formatDate, imageUrl, showAmount } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import { formatPlace, orderTone, paymentLabel, paymentTone, ticketLabel, ticketTone } from '@/lib/status';
import type { Order, Pagination as PaginationMeta } from '@/types';

/* ------------------------------- Dashboard -------------------------------- */

type DashboardPayload = {
  widgets: Record<string, number>;
  recent_orders: Order[];
  total_spent: number;
  wishlist_count: number;
  unread_notifications: number;
};

/** Page title strip shared by every account screen. */
function AccountHeading({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="dashboard-header">
      <div>
        <h4 className="dashboard-header__title">{title}</h4>
        {desc && <p className="dashboard-header__desc">{desc}</p>}
      </div>
      {action && <div className="dashboard-header__action">{action}</div>}
    </div>
  );
}

/** Street line plus place, without repeating a city the street line already names. */
function addressLine(street: string | null | undefined, place: string): string {
  const line = (street ?? '').trim();
  if (!place || line.toLowerCase().includes(place.toLowerCase())) return line;
  return [line, place].filter(Boolean).join(', ');
}

/** "← My orders" link above a detail page's heading. */
function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="account-back">
      <i className="las la-arrow-left" /> {label}
    </Link>
  );
}

/** Centered empty state used inside account cards. */
function AccountEmpty({
  icon,
  title,
  desc,
  action,
}: {
  icon: string;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="account-empty">
      <span className="account-empty__icon">
        <i className={icon} />
      </span>
      <h6 className="account-empty__title">{title}</h6>
      {desc && <p className="account-empty__desc">{desc}</p>}
      {action}
    </div>
  );
}

export function AccountDashboard() {
  const t = useTranslate();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    api<DashboardPayload>('/user/dashboard', { auth: 'user' })
      .then(setData)
      .catch(() => undefined);
  }, []);

  const tiles = [
    { label: 'Total orders', value: data?.widgets.order_total ?? 0, icon: 'las la-shopping-bag', tone: 'base' },
    { label: 'Pending', value: data?.widgets.order_pending ?? 0, icon: 'las la-hourglass-half', tone: 'warning' },
    { label: 'Delivered', value: data?.widgets.order_delivered ?? 0, icon: 'las la-check-circle', tone: 'success' },
    { label: 'Cancelled', value: data?.widgets.order_cancelled ?? 0, icon: 'las la-times-circle', tone: 'danger' },
  ];

  const shortcuts = [
    { href: '/user/orders', label: 'My orders', desc: 'Track and review purchases', icon: 'las la-box' },
    { href: '/wishlist', label: 'Saved products', desc: `${data?.wishlist_count ?? 0} item(s) saved`, icon: 'las la-heart' },
    { href: '/user/addresses', label: 'Addresses', desc: 'Where we deliver to you', icon: 'las la-map-marker-alt' },
    {
      href: '/user/notifications',
      label: 'Notifications',
      desc: data?.unread_notifications ? `${data.unread_notifications} unread` : 'You are all caught up',
      icon: 'las la-bell',
    },
  ];

  const orders = data?.recent_orders ?? [];

  return (
    <div className="account-stack">
      <div className="account-hero">
        <div className="account-hero__content">
          <span className="account-hero__eyebrow">My VIPURI account</span>
          <h3 className="account-hero__title">Karibu, {user?.firstname || user?.username}</h3>
          <p className="account-hero__desc">Track your orders, manage your addresses and keep every drive running smoothly.</p>
          <div className="account-hero__actions">
            <Link href="/products" className="btn btn--base">
              <i className="las la-shopping-cart" /> Continue shopping
            </Link>
            <Link href="/track-order" className="btn account-hero__btn-ghost">
              <i className="las la-truck" /> Track an order
            </Link>
          </div>
        </div>
        <div className="account-hero__stat">
          <span className="account-hero__stat-label">Total spent</span>
          <strong className="account-hero__stat-value">{showAmount(data?.total_spent ?? 0)}</strong>
          <span className="account-hero__stat-note">on paid orders</span>
        </div>
      </div>

      <div className="row g-3">
        {tiles.map((tile) => (
          <div className="col-6 col-xl-3" key={tile.label}>
            <div className={`dashboard-widget dashboard-widget--${tile.tone}`}>
              <div className="dashboard-widget__icon">
                <i className={tile.icon} />
              </div>
              <div className="dashboard-widget__content">
                <span className="dashboard-widget__label">{tile.label}</span>
                <h4 className="dashboard-widget__value">{tile.value}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="checkout-card">
        <div className="checkout-card__head">
          <h5 className="checkout-card__title mb-0">Recent orders</h5>
          <Link href="/user/orders" className="checkout-card__link">
            {t('View all')} <i className="las la-arrow-right" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="account-empty">
            <span className="account-empty__icon">
              <i className="las la-shopping-bag" />
            </span>
            <h6 className="account-empty__title">No orders yet</h6>
            <p className="account-empty__desc">Genuine parts from VIPURI branches across Tanzania are a few clicks away.</p>
            <Link href="/products" className="btn btn--base btn--sm">
              Browse products
            </Link>
          </div>
        ) : (
          <ul className="order-list">
            {orders.map((order) => (
              <li key={order.id}>
                <Link className="order-list__item" href={`/user/orders/${order.order_number}`}>
                  <span className="order-list__icon">
                    <i className="las la-receipt" />
                  </span>
                  <span className="order-list__main">
                    <span className="order-list__number">#{order.order_number}</span>
                    <span className="order-list__meta">
                      {formatDate(order.created_at)} · {paymentLabel(order.payment_status, order.payment_status_label)}
                    </span>
                  </span>
                  <span className={`status-pill status-pill--${orderTone(order.status)}`}>{order.status_label}</span>
                  <span className="order-list__total">{showAmount(order.total)}</span>
                  <i className="las la-angle-right order-list__arrow" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="row g-3">
        {shortcuts.map((item) => (
          <div className="col-sm-6 col-xl-3" key={item.href}>
            <Link className="account-shortcut" href={item.href}>
              <span className="account-shortcut__icon">
                <i className={item.icon} />
              </span>
              <span className="account-shortcut__label">{item.label}</span>
              <span className="account-shortcut__desc">{item.desc}</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------- Orders --------------------------------- */

const ORDER_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'completed', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

/** Placeholder rows shown while a list loads. */
function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="vp-skeleton vp-skeleton--line" key={index} />
      ))}
    </div>
  );
}

export function AccountOrders() {
  const t = useTranslate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api<{ orders: Order[]; pagination: PaginationMeta }>(
        `/user/orders?status=${status}&page=${page}`,
        { auth: 'user' },
      );
      setOrders(data.orders ?? []);
      setPagination(data.pagination ?? null);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTab = ORDER_TABS.find((tab) => tab.key === status);

  return (
    <div className="account-stack">
      <AccountHeading title={t('My Orders')} desc="Every order you have placed with VIPURI, newest first." />

      <ul className="account-tabs" role="tablist" aria-label="Filter orders">
        {ORDER_TABS.map((tab) => (
          <li key={tab.key}>
            <button
              type="button"
              role="tab"
              aria-selected={status === tab.key}
              className={`account-tabs__btn ${status === tab.key ? 'active' : ''}`}
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="checkout-card">
        {loading ? (
          <ListSkeleton />
        ) : orders.length === 0 ? (
          <AccountEmpty
            icon="las la-shopping-bag"
            title={status ? `No ${activeTab?.label.toLowerCase()} orders` : 'No orders yet'}
            desc={
              status
                ? 'Nothing matches this filter right now.'
                : 'Genuine parts from VIPURI branches across Tanzania are a few clicks away.'
            }
            action={
              status ? (
                <button type="button" className="btn btn--base btn--sm" onClick={() => setStatus('')}>
                  Show all orders
                </button>
              ) : (
                <Link href="/products" className="btn btn--base btn--sm">
                  Browse products
                </Link>
              )
            }
          />
        ) : (
          <ul className="order-list">
            {orders.map((order) => (
              <li key={order.id}>
                <Link className="order-list__item" href={`/user/orders/${order.order_number}`}>
                  <span className="order-list__icon">
                    <i className="las la-receipt" />
                  </span>
                  <span className="order-list__main">
                    <span className="order-list__number">#{order.order_number}</span>
                    <span className="order-list__meta">
                      {[
                        formatDate(order.created_at),
                        order.branch?.name,
                        paymentLabel(order.payment_status, order.payment_status_label),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className={`status-pill status-pill--${orderTone(order.status)}`}>{order.status_label}</span>
                  <span className="order-list__total">{showAmount(order.total)}</span>
                  <i className="las la-angle-right order-list__arrow" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pagination && pagination.last_page > 1 && <Pagination pagination={pagination} onChange={setPage} />}
    </div>
  );
}

/** Orders that have left the branch (or ended) can no longer be paid online. */
const NO_ONLINE_PAYMENT = [3, 4, 6, 7];

export function AccountOrderDetail({ orderNumber }: { orderNumber: string }) {
  const t = useTranslate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ order: Order }>(`/user/orders/${orderNumber}`, { auth: 'user' });
      setOrder(data.order);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="account-stack">
        <div className="vp-skeleton vp-skeleton--title" />
        <div className="checkout-card">
          <ListSkeleton />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="account-stack">
        <BackLink href="/user/orders" label="My orders" />
        <div className="checkout-card">
          <AccountEmpty
            icon="las la-search"
            title="Order not found"
            desc="We could not find this order on your account."
            action={
              <Link href="/user/orders" className="btn btn--base btn--sm">
                View my orders
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const address = order.shipping_address ?? {};
  const cancellable = [0, 1, 2].includes(order.status);
  const paid = order.payment_status === 1;
  const canPay = !paid && order.payment_status !== 2 && !order.cod && !NO_ONLINE_PAYMENT.includes(order.status);
  const unpaidDelivered = !paid && order.status === 4;
  const place = formatPlace(address.city, address.state);
  const phone = [address.dial_code, address.mobile].filter(Boolean).join(' ');

  // Oldest first, so the list reads top to bottom and the last step is "now".
  const logs = (order.status_logs ?? [])
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id);

  const cancel = async () => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;

    setCancelling(true);
    try {
      const { message } = await apiWithMessage(`/user/orders/${order.order_number}/cancel`, {
        method: 'POST',
        auth: 'user',
        body: { reason: 'Cancelled by customer' },
      });
      toastSuccess(message);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not cancel this order');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="account-stack">
      <BackLink href="/user/orders" label="My orders" />

      <AccountHeading
        title={`Order #${order.order_number}`}
        desc={`Placed ${formatDate(order.created_at, true)}`}
        action={
          <>
            <span className={`status-pill status-pill--${orderTone(order.status)}`}>{order.status_label}</span>
            <span className={`status-pill status-pill--${paymentTone(order.payment_status)}`}>
              {paymentLabel(order.payment_status, order.payment_status_label)}
            </span>
            <button
              type="button"
              className="account-btn"
              onClick={async () => {
                try {
                  await downloadFile(
                    `/user/orders/${order.order_number}/invoice`,
                    `invoice-${order.order_number}.pdf`,
                    'user',
                  );
                } catch (error) {
                  toastError(error instanceof ApiError ? error.message : 'Could not generate the invoice');
                }
              }}
            >
              <i className="las la-file-invoice" /> Invoice
            </button>
          </>
        }
      />

      <div className="checkout-card">
        <h5 className="checkout-card__title">Items</h5>
        <ul className="checkout-item-list">
          {(order.items ?? []).map((item) => (
            <li className="checkout-item" key={item.id}>
              <div className="checkout-item__thumb">
                <img src={imageUrl(item.image)} alt={item.product_name ?? 'product'} />
                <span className="checkout-item__qty">{item.quantity}</span>
              </div>
              <div className="checkout-item__content">
                <h6 className="checkout-item__title">
                  {item.product_slug ? (
                    <Link href={`/product/${item.product_slug}`}>{item.product_name}</Link>
                  ) : (
                    item.product_name
                  )}
                </h6>
                {item.variation_label && <span className="checkout-item__variant">{item.variation_label}</span>}
                <span className="checkout-item__unit">
                  {/* Line totals include VAT while `price` does not, so derive the unit price from the line. */}
                  {showAmount(item.quantity > 0 ? item.subtotal / item.quantity : item.price)} × {item.quantity}
                </span>
              </div>
              <span className="checkout-item__price">{showAmount(item.subtotal)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="checkout-card h-100">
            <h5 className="checkout-card__title">Delivery</h5>
            <p className="account-detail-text">
              <strong>{[address.firstname, address.lastname].filter(Boolean).join(' ') || '—'}</strong>
              {addressLine(address.address, place) && (
                <>
                  <br />
                  {addressLine(address.address, place)}
                </>
              )}
              {phone && (
                <>
                  <br />
                  {phone}
                </>
              )}
            </p>
            {(order.branch || order.shipping_method) && (
              <ul className="account-detail-meta">
                {order.branch && (
                  <li>
                    <i className="las la-store" /> Fulfilled by {order.branch.name}
                  </li>
                )}
                {order.shipping_method && (
                  <li>
                    <i className="las la-truck" /> {order.shipping_method}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="col-md-6">
          <div className="checkout-card h-100">
            <h5 className="checkout-card__title">Summary</h5>
            <ul className="account-summary">
              <li>
                <span>{t('Subtotal')}</span>
                <span>{showAmount(order.subtotal)}</span>
              </li>
              {order.total_tax > 0 && (
                <li className="account-summary__included">
                  <span>VAT (included)</span>
                  <span>{showAmount(order.total_tax)}</span>
                </li>
              )}
              <li>
                <span>Delivery</span>
                <span>{order.shipping_charge > 0 ? showAmount(order.shipping_charge) : 'Free'}</span>
              </li>
              {order.discount > 0 && (
                <li className="account-summary__discount">
                  <span>{t('Discount')}</span>
                  <span>− {showAmount(order.discount)}</span>
                </li>
              )}
            </ul>
            <div className="account-summary__total">
              <span>{t('Total')}</span>
              <span>{showAmount(order.total)}</span>
            </div>

            {unpaidDelivered && (
              <p className="account-note">
                <i className="las la-info-circle" />
                <span>Payment not yet recorded — contact support if you have paid.</span>
              </p>
            )}

            {(canPay || cancellable) && (
              <div className="form-actions">
                {cancellable && (
                  <button className="btn btn-outline--danger" type="button" disabled={cancelling} onClick={cancel}>
                    {cancelling ? 'Cancelling…' : 'Cancel order'}
                  </button>
                )}
                {canPay && (
                  <Link href={`/checkout/payment/${order.order_number}`} className="btn btn--base">
                    Pay now
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="checkout-card">
          <h5 className="checkout-card__title">Progress</h5>
          <ul className="order-timeline">
            {logs.map((log, index) => {
              const current = index === logs.length - 1;
              return (
                <li
                  className={`order-timeline__item ${current ? 'order-timeline__item--current' : ''}`}
                  key={log.id}
                  aria-current={current ? 'step' : undefined}
                >
                  <div className="order-timeline__dot" />
                  <div className="order-timeline__content">
                    <h6 className="order-timeline__title">{log.to_status_label}</h6>
                    <span className="order-timeline__time">{formatDate(log.created_at, true)}</span>
                    {log.remark && <p className="order-timeline__remark">{log.remark}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Addresses ------------------------------- */

type Address = {
  id: number;
  title: string;
  firstname: string;
  lastname: string;
  dial_code: string | null;
  mobile: string;
  email: string | null;
  address: string;
  city: string;
  state: string | null;
  zip: string | null;
  is_default: boolean;
};

const EMPTY_ADDRESS = {
  title: '',
  firstname: '',
  lastname: '',
  dial_code: '+255',
  mobile: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  is_default: false,
};

export function AccountAddresses() {
  const t = useTranslate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY_ADDRESS });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ addresses: Address[] }>('/user/addresses', { auth: 'user' });
      setAddresses(data.addresses ?? []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const focusForm = () => {
    const field = document.getElementById('address-label');
    field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field?.focus({ preventScroll: true });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_ADDRESS });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const { message } = await apiWithMessage(editingId ? `/user/addresses/${editingId}` : '/user/addresses', {
        method: 'POST',
        auth: 'user',
        body: form,
      });

      toastSuccess(message);
      resetForm();
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not save the address');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (address: Address) => {
    if (!window.confirm(`Remove "${address.title}" from your addresses?`)) return;

    try {
      const { message } = await apiWithMessage(`/user/addresses/${address.id}`, {
        method: 'DELETE',
        auth: 'user',
      });
      toastSuccess(message);
      if (editingId === address.id) resetForm();
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not remove the address');
    }
  };

  return (
    <div className="account-stack">
      <AccountHeading title={t('Addresses')} desc="Saved delivery addresses for a faster checkout." />

      <div className="row g-4">
        <div className="col-lg-7">
          {loading ? (
            <div className="checkout-card">
              <ListSkeleton />
            </div>
          ) : addresses.length === 0 ? (
            <div className="checkout-card">
              <AccountEmpty
                icon="las la-map-marker-alt"
                title="Add your first address"
                desc="Save where you want parts delivered and checkout will fill it in for you."
                action={
                  <button type="button" className="btn btn--base btn--sm" onClick={focusForm}>
                    Add an address
                  </button>
                }
              />
            </div>
          ) : (
            <div className="account-cards">
              {addresses.map((address) => {
                const place = formatPlace(address.city, address.state);
                return (
                  <div
                    className={`checkout-card address-card ${editingId === address.id ? 'address-card--editing' : ''}`}
                    key={address.id}
                  >
                    <div className="address-card__head">
                      <span className="address-card__icon">
                        <i className="las la-map-marker-alt" />
                      </span>
                      <h6 className="address-card__title">{address.title}</h6>
                      {address.is_default && <span className="status-pill status-pill--success">Default</span>}
                    </div>
                    <p className="address-card__body">
                      <strong>
                        {address.firstname} {address.lastname}
                      </strong>
                      <br />
                      {addressLine(address.address, place)}
                      <br />
                      {[address.dial_code, address.mobile].filter(Boolean).join(' ')}
                    </p>
                    <div className="address-card__actions">
                      <button
                        className="account-btn"
                        type="button"
                        onClick={() => {
                          setEditingId(address.id);
                          setForm({
                            title: address.title,
                            firstname: address.firstname,
                            lastname: address.lastname,
                            dial_code: address.dial_code ?? '+255',
                            mobile: address.mobile,
                            email: address.email ?? '',
                            address: address.address,
                            city: address.city,
                            state: address.state ?? '',
                            zip: address.zip ?? '',
                            is_default: address.is_default,
                          });
                          focusForm();
                        }}
                      >
                        <i className="las la-pen" /> Edit
                      </button>
                      <button className="account-btn account-btn--danger" type="button" onClick={() => remove(address)}>
                        <i className="las la-trash-alt" /> {t('Remove')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="col-lg-5">
          <div className="checkout-card">
            <h5 className="checkout-card__title">{editingId ? 'Edit address' : 'Add a new address'}</h5>
            <form onSubmit={submit}>
              <h6 className="form-section-title">
                <i className="las la-user" /> Contact
              </h6>
              <div className="row gy-3">
                <div className="col-12">
                  <label className="form--label" htmlFor="address-label">
                    Label
                  </label>
                  <input
                    id="address-label"
                    className="form-control form--control"
                    required
                    placeholder="e.g. Home, Office, Garage"
                    value={form.title}
                    onChange={update('title')}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form--label">{t('First name')}</label>
                  <input className="form-control form--control" required value={form.firstname} onChange={update('firstname')} />
                </div>
                <div className="col-sm-6">
                  <label className="form--label">{t('Last name')}</label>
                  <input className="form-control form--control" required value={form.lastname} onChange={update('lastname')} />
                </div>
                <div className="col-12">
                  <label className="form--label">{t('Mobile')}</label>
                  <div className="input-group input--group">
                    <span className="input-group-text">{form.dial_code || '+255'}</span>
                    <input
                      className="form-control form--control"
                      required
                      inputMode="tel"
                      value={form.mobile}
                      onChange={update('mobile')}
                    />
                  </div>
                </div>
              </div>

              <h6 className="form-section-title">
                <i className="las la-map-marked-alt" /> Location
              </h6>
              <div className="row gy-3">
                <div className="col-12">
                  <label className="form--label">Street address</label>
                  <input className="form-control form--control" required value={form.address} onChange={update('address')} />
                </div>
                <div className="col-sm-6">
                  <label className="form--label">City</label>
                  <input className="form-control form--control" required value={form.city} onChange={update('city')} />
                </div>
                <div className="col-sm-6">
                  <label className="form--label">Region</label>
                  <input className="form-control form--control" value={form.state} onChange={update('state')} />
                </div>
                <div className="col-12">
                  <div className="form-check form--check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="default-address"
                      checked={form.is_default}
                      onChange={(event) => setForm((current) => ({ ...current, is_default: event.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="default-address">
                      Use as my default address
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                {editingId && (
                  <button className="btn btn-outline--base" type="button" onClick={resetForm}>
                    {t('Cancel')}
                  </button>
                )}
                <button className="btn btn--base" type="submit" disabled={busy}>
                  {busy ? 'Saving…' : editingId ? 'Update address' : 'Save address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Reviews -------------------------------- */

type ReviewableProduct = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  reviewed: boolean;
  /** The star rating the customer gave, when the API includes it. */
  rating?: number | null;
};

function Stars({ value }: { value: number }) {
  return (
    <span className="review-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i key={star} className={`las la-star ${star <= value ? 'is-on' : ''}`} />
      ))}
    </span>
  );
}

export function AccountReviews() {
  const t = useTranslate();
  const [products, setProducts] = useState<ReviewableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReviewableProduct | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ products: ReviewableProduct[] }>('/user/reviewable-products', { auth: 'user' });
      setProducts(data.products ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Products still waiting for a review come first.
  const sorted = useMemo(
    () => products.slice().sort((a, b) => Number(a.reviewed) - Number(b.reviewed)),
    [products],
  );

  useEffect(() => {
    if (selected) document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selected]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;

    setBusy(true);

    try {
      const { message } = await apiWithMessage('/user/reviews', {
        method: 'POST',
        auth: 'user',
        body: { product_id: selected.id, rating, review },
      });

      toastSuccess(message);
      setSelected(null);
      setReview('');
      setRating(5);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not submit your review');
    } finally {
      setBusy(false);
    }
  };

  const pending = products.filter((product) => !product.reviewed).length;

  return (
    <div className="account-stack">
      <AccountHeading
        title={t('Reviews')}
        desc={
          pending > 0
            ? `Rate the parts you have received — ${pending} waiting for your review.`
            : 'Rate the parts you have received.'
        }
      />

      {loading ? (
        <div className="checkout-card">
          <ListSkeleton />
        </div>
      ) : products.length === 0 ? (
        <div className="checkout-card">
          <AccountEmpty
            icon="las la-star"
            title="Nothing to review yet"
            desc="Once an order is delivered, its parts show up here for you to rate."
            action={
              <Link href="/products" className="btn btn--base btn--sm">
                Browse products
              </Link>
            }
          />
        </div>
      ) : (
        <div className="row g-3">
          {sorted.map((product) => (
            <div className="col-md-6" key={product.id}>
              <div className="checkout-card review-card">
                <img className="review-thumb" src={imageUrl(product.image)} alt={product.name} />
                <div className="review-card__body">
                  <h6 className="review-card__name">
                    <Link href={`/product/${product.slug}`}>{product.name}</Link>
                  </h6>
                  {product.reviewed ? (
                    <div className="review-card__status">
                      <span className="status-pill status-pill--success">Reviewed</span>
                      {product.rating ? <Stars value={product.rating} /> : null}
                    </div>
                  ) : (
                    <button className="account-btn" type="button" onClick={() => setSelected(product)}>
                      <i className="las la-pen" /> {t('Write a review')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="checkout-card" id="review-form">
          <h5 className="checkout-card__title">Review {selected.name}</h5>
          <form onSubmit={submit}>
            <h6 className="form-section-title">
              <i className="las la-star" /> {t('Rating')}
            </h6>
            <div className="review-star-input" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  className={star <= rating ? 'is-on' : ''}
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                >
                  <i className="las la-star" />
                </button>
              ))}
            </div>

            <h6 className="form-section-title">
              <i className="las la-comment" /> Your review
            </h6>
            <textarea
              className="form-control form--control"
              rows={4}
              maxLength={2000}
              placeholder="How did the part fit and perform?"
              value={review}
              onChange={(event) => setReview(event.target.value)}
            />

            <div className="form-actions">
              <button className="btn btn-outline--base" type="button" onClick={() => setSelected(null)}>
                {t('Cancel')}
              </button>
              <button className="btn btn--base" type="submit" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit review'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Payments -------------------------------- */

type PaymentRow = {
  id: number;
  trx: string;
  order_number: string | null;
  method: string | null;
  amount: number;
  charge: number;
  final_amount: number;
  currency: string | null;
  status: number;
  status_label: string;
  created_at: string;
};

export function AccountPayments() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ payments: PaymentRow[]; pagination: PaginationMeta }>(`/user/payments?page=${page}`, { auth: 'user' })
      .then((data) => {
        setRows(data.payments ?? []);
        setPagination(data.pagination ?? null);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="account-stack">
      <AccountHeading title="Payment history" desc="Payments made against your orders." />

      <div className="checkout-card">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <AccountEmpty
            icon="las la-credit-card"
            title="No payments yet"
            desc="Payments you make online for your orders will be listed here."
            action={
              <Link href="/user/orders" className="btn btn--base btn--sm">
                View my orders
              </Link>
            }
          />
        ) : (
          <ul className="order-list">
            {rows.map((row) => {
              const content = (
                <>
                  <span className="order-list__icon">
                    <i className="las la-credit-card" />
                  </span>
                  <span className="order-list__main">
                    <span className="order-list__number">{row.trx}</span>
                    <span className="order-list__meta">
                      {[row.order_number && `Order #${row.order_number}`, formatDate(row.created_at), row.method]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className={`status-pill status-pill--${paymentTone(row.status)}`}>
                    {paymentLabel(row.status, row.status_label)}
                  </span>
                  <span className="order-list__total">{showAmount(row.final_amount)}</span>
                </>
              );

              return (
                <li key={row.id}>
                  {row.order_number ? (
                    <Link className="order-list__item" href={`/user/orders/${row.order_number}`}>
                      {content}
                      <i className="las la-angle-right order-list__arrow" />
                    </Link>
                  ) : (
                    <div className="order-list__item">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pagination && pagination.last_page > 1 && <Pagination pagination={pagination} onChange={setPage} />}
    </div>
  );
}

/* ------------------------------ Notifications ----------------------------- */

type NotificationRow = { id: number; title: string; click_url: string | null; is_read: boolean; created_at: string };

export function AccountNotifications() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<{ notifications: NotificationRow[]; unread: number }>('/user/notifications', {
        auth: 'user',
      });
      setRows(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (row: NotificationRow) => {
    try {
      await api(`/user/notifications/${row.id}/read`, { method: 'POST', auth: 'user' });
      await load();
    } catch {
      toastError('Could not update this notification');
    }
  };

  return (
    <div className="account-stack">
      <AccountHeading
        title="Notifications"
        desc={unread > 0 ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'You are all caught up.'}
        action={
          unread > 0 ? (
            <button
              className="account-btn"
              type="button"
              onClick={async () => {
                try {
                  await api('/user/notifications/read-all', { method: 'POST', auth: 'user' });
                  await load();
                } catch {
                  toastError('Could not mark notifications as read');
                }
              }}
            >
              <i className="las la-check-double" /> Mark all read
            </button>
          ) : undefined
        }
      />

      <div className="checkout-card">
        {loading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <AccountEmpty
            icon="las la-bell"
            title="No notifications yet"
            desc="Order updates and replies from the VIPURI team will appear here."
          />
        ) : (
          <ul className="order-list">
            {rows.map((row) => {
              const content = (
                <>
                  <span className={`order-list__icon ${row.is_read ? 'order-list__icon--neutral' : ''}`}>
                    <i className="las la-bell" />
                  </span>
                  <span className="order-list__main">
                    <span className="order-list__title">
                      {!row.is_read && <span className="account-dot" aria-label="Unread" />}
                      {row.title}
                    </span>
                    <span className="order-list__meta">{formatDate(row.created_at, true)}</span>
                  </span>
                </>
              );
              const url = row.click_url && row.click_url !== '#' ? row.click_url : null;
              const onOpen = () => {
                if (!row.is_read) void api(`/user/notifications/${row.id}/read`, { method: 'POST', auth: 'user' }).catch(() => undefined);
              };

              return (
                <li
                  key={row.id}
                  className={`order-list__row ${row.is_read ? 'order-list__row--read' : 'order-list__row--unread'}`}
                >
                  {url ? (
                    url.startsWith('/') ? (
                      <Link className="order-list__item" href={url} onClick={onOpen}>
                        {content}
                      </Link>
                    ) : (
                      <a className="order-list__item" href={url} onClick={onOpen}>
                        {content}
                      </a>
                    )
                  ) : (
                    <div className="order-list__item">{content}</div>
                  )}
                  {!row.is_read && (
                    <button
                      className="account-icon-btn"
                      type="button"
                      title="Mark as read"
                      aria-label="Mark as read"
                      onClick={() => void markRead(row)}
                    >
                      <i className="las la-check" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Profile -------------------------------- */

export function AccountProfile() {
  const t = useTranslate();
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    dial_code: '+255',
    mobile: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // Show the chosen photo straight away, before it is saved.
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!user) return;

    setForm({
      firstname: user.firstname ?? '',
      lastname: user.lastname ?? '',
      dial_code: user.dial_code ?? '+255',
      mobile: user.mobile ?? '',
      address: user.address ?? '',
      city: user.city ?? '',
      state: user.state ?? '',
      zip: user.zip ?? '',
    });
  }, [user]);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      if (image) body.append('image', image);

      const { message } = await apiWithMessage('/user/profile', { method: 'POST', auth: 'user', body });
      toastSuccess(message);
      await refresh();
      setImage(null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not update your profile');
    } finally {
      setBusy(false);
    }
  };

  const name = user?.fullname?.trim() || user?.username || 'Customer';
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'V';
  const photo = preview ?? (user?.image ? imageUrl(user.image) : null);

  return (
    <div className="account-stack">
      <AccountHeading title="Profile setting" desc="Keep your details up to date so deliveries and receipts reach you." />

      <form onSubmit={submit}>
        <div className="row g-4">
          <div className="col-xl-4">
            <div className="profile-card">
              <div className="profile-card__cover" />
              <div className="profile-card__avatar">
                {photo ? <img src={photo} alt={name} /> : <span>{initials}</span>}
                <label className="profile-card__upload" title="Change photo">
                  <i className="las la-camera" />
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => setImage(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <h5 className="profile-card__name">{name}</h5>
              <span className="profile-card__username">@{user?.username}</span>

              <ul className="profile-card__facts">
                <li>
                  <i className="las la-envelope" />
                  <span>{user?.email}</span>
                  {user?.email_verified && <i className="las la-check-circle profile-card__verified" title="Verified" />}
                </li>
                <li>
                  <i className="las la-phone" />
                  <span>{user?.mobile ? `${user.dial_code ?? ''} ${user.mobile}` : 'No mobile number'}</span>
                </li>
                <li>
                  <i className="las la-map-marker" />
                  <span>{formatPlace(user?.city, user?.state) || 'No location set'}</span>
                </li>
              </ul>
              {image && <p className="profile-card__hint">New photo selected — save to apply it.</p>}
            </div>
          </div>

          <div className="col-xl-8">
            <div className="checkout-card">
              <h6 className="form-section-title">
                <i className="las la-user" /> Personal details
              </h6>
              <div className="row gy-3">
                <div className="col-sm-6">
                  <label className="form--label">{t('First name')}</label>
                  <input className="form-control form--control" required value={form.firstname} onChange={update('firstname')} />
                </div>
                <div className="col-sm-6">
                  <label className="form--label">{t('Last name')}</label>
                  <input className="form-control form--control" required value={form.lastname} onChange={update('lastname')} />
                </div>
                <div className="col-sm-6">
                  <label className="form--label">E-mail</label>
                  <input className="form-control form--control" value={user?.email ?? ''} disabled />
                </div>
                <div className="col-sm-6">
                  <label className="form--label">{t('Mobile')}</label>
                  <div className="input-group input--group">
                    <span className="input-group-text">{form.dial_code}</span>
                    <input className="form-control form--control" value={form.mobile} onChange={update('mobile')} />
                  </div>
                </div>
              </div>

              <h6 className="form-section-title">
                <i className="las la-map-marked-alt" /> Address
              </h6>
              <div className="row gy-3">
                <div className="col-12">
                  <label className="form--label">Street address</label>
                  <input className="form-control form--control" value={form.address} onChange={update('address')} />
                </div>
                <div className="col-sm-6">
                  <label className="form--label">City</label>
                  <input className="form-control form--control" value={form.city} onChange={update('city')} />
                </div>
                <div className="col-sm-6">
                  <label className="form--label">Region</label>
                  <input className="form-control form--control" value={form.state} onChange={update('state')} />
                </div>
              </div>

              <div className="form-actions">
                <button className="btn btn--base" type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export function AccountChangePassword() {
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.password !== form.password_confirmation) {
      toastError('The passwords do not match');
      return;
    }

    setBusy(true);

    try {
      const { message } = await apiWithMessage('/user/change-password', {
        method: 'POST',
        auth: 'user',
        body: form,
      });

      toastSuccess(message);
      setForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not change your password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-stack">
      <AccountHeading title="Change password" desc="Use a strong password you do not use anywhere else." />

      <div className="row g-4">
        <div className="col-xl-8">
          <div className="checkout-card">
            <form onSubmit={submit}>
              <div className="row gy-3">
                <div className="col-12">
                  <label className="form--label">Current password</label>
                  <input
                    className="form-control form--control"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={form.current_password}
                    onChange={update('current_password')}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form--label">New password</label>
                  <input
                    className="form-control form--control"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={form.password}
                    onChange={update('password')}
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form--label">Confirm new password</label>
                  <input
                    className="form-control form--control"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={form.password_confirmation}
                    onChange={update('password_confirmation')}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn--base" type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Change password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="tip-card">
            <span className="tip-card__icon">
              <i className="las la-shield-alt" />
            </span>
            <h6 className="tip-card__title">Keep your account safe</h6>
            <ul className="tip-card__list">
              <li>At least 8 characters</li>
              <li>Mix letters, numbers and symbols</li>
              <li>Never share it — VIPURI staff will never ask for it</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


/* --------------------------------- Tickets -------------------------------- */

type Ticket = {
  id: number;
  ticket: string;
  subject: string;
  status: number;
  priority: number;
  last_reply: string | null;
  created_at: string;
};

type TicketMessage = {
  id: number;
  message: string;
  from_admin: boolean;
  admin_name: string | null;
  created_at: string;
  attachments: { id: number; name: string }[];
};

function TicketPill({ status }: { status: number }) {
  return <span className={`status-pill status-pill--${ticketTone(status)}`}>{ticketLabel(status)}</span>;
}

export function AccountTickets() {
  const t = useTranslate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', message: '', priority: '2' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ tickets: Ticket[] }>('/user/tickets', { auth: 'user' });
      setTickets(data.tickets ?? []);
    } catch {
      setTickets([]);
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
      const { message } = await apiWithMessage('/user/tickets', { method: 'POST', auth: 'user', body: form });
      toastSuccess(message);
      setForm({ subject: '', message: '', priority: '2' });
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not create the ticket');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-stack">
      <AccountHeading title="Support" desc="Open a ticket and the VIPURI team will get back to you." />

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="checkout-card">
            <h5 className="checkout-card__title">Your tickets</h5>
            {loading ? (
              <ListSkeleton />
            ) : tickets.length === 0 ? (
              <AccountEmpty
                icon="las la-headset"
                title="No tickets yet"
                desc="Questions about an order or a part? Open a ticket and we will reply here."
                action={
                  <button
                    type="button"
                    className="btn btn--base btn--sm"
                    onClick={() => {
                      const field = document.getElementById('ticket-subject');
                      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      field?.focus({ preventScroll: true });
                    }}
                  >
                    Open a ticket
                  </button>
                }
              />
            ) : (
              <ul className="order-list">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link className="order-list__item" href={`/user/tickets/${ticket.ticket}`}>
                      <span className="order-list__icon">
                        <i className="las la-headset" />
                      </span>
                      <span className="order-list__main">
                        <span className="order-list__number">{ticket.subject}</span>
                        <span className="order-list__meta">
                          #{ticket.ticket} · {formatDate(ticket.last_reply ?? ticket.created_at)}
                        </span>
                      </span>
                      <TicketPill status={ticket.status} />
                      <i className="las la-angle-right order-list__arrow" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="checkout-card">
            <h5 className="checkout-card__title">Open a ticket</h5>
            <form onSubmit={submit}>
              <h6 className="form-section-title">
                <i className="las la-edit" /> Your question
              </h6>
              <div className="row gy-3">
                <div className="col-12">
                  <label className="form--label" htmlFor="ticket-subject">
                    {t('Subject')}
                  </label>
                  <input
                    id="ticket-subject"
                    className="form-control form--control"
                    required
                    placeholder="e.g. Brake pads for order #…"
                    value={form.subject}
                    onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <label className="form--label" htmlFor="ticket-priority">
                    Priority
                  </label>
                  <select
                    id="ticket-priority"
                    className="form-select form--select form--control"
                    value={form.priority}
                    onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                  >
                    <option value="1">Low</option>
                    <option value="2">Medium</option>
                    <option value="3">High</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form--label" htmlFor="ticket-message">
                    {t('Message')}
                  </label>
                  <textarea
                    id="ticket-message"
                    className="form-control form--control"
                    rows={5}
                    required
                    value={form.message}
                    onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn--base" type="submit" disabled={busy}>
                  {busy ? 'Sending…' : 'Create ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountTicketDetail({ ticketNumber }: { ticketNumber: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ ticket: Ticket; messages: TicketMessage[] }>(`/user/tickets/${ticketNumber}`, {
        auth: 'user',
      });

      setTicket(data.ticket);
      setMessages(data.messages ?? []);
    } catch {
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="account-stack">
        <div className="vp-skeleton vp-skeleton--title" />
        <div className="checkout-card">
          <ListSkeleton />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="account-stack">
        <BackLink href="/user/tickets" label="Support" />
        <div className="checkout-card">
          <AccountEmpty
            icon="las la-search"
            title="Ticket not found"
            desc="We could not find this ticket on your account."
            action={
              <Link href="/user/tickets" className="btn btn--base btn--sm">
                Back to support
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  // The API sends newest first; a conversation reads oldest first.
  const thread = messages.slice().reverse();

  return (
    <div className="account-stack">
      <AccountHeading
        title={ticket.subject}
        desc={`#${ticket.ticket} · opened ${formatDate(ticket.created_at, true)}`}
        action={
          <>
            <TicketPill status={ticket.status} />
            <Link href="/user/tickets" className="account-btn">
              <i className="las la-arrow-left" /> Support
            </Link>
          </>
        }
      />

      <div className="checkout-card">
        <ul className="ticket-thread">
          {thread.map((message) => (
            <li className={`ticket-msg ${message.from_admin ? 'ticket-msg--staff' : 'ticket-msg--mine'}`} key={message.id}>
              <div className="ticket-msg__meta">
                <span className="ticket-msg__author">
                  {message.from_admin ? (message.admin_name ?? 'VIPURI Support') : 'You'}
                </span>
                <time dateTime={message.created_at}>{formatDate(message.created_at, true)}</time>
              </div>
              <div className="ticket-msg__bubble">
                <p className="ticket-msg__text">{message.message}</p>

                {message.attachments?.length > 0 && (
                  <ul className="ticket-attachments">
                    {message.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <button
                          type="button"
                          className="account-btn"
                          onClick={async () => {
                            try {
                              await downloadFile(`/user/attachments/${attachment.id}`, attachment.name, 'user');
                            } catch (error) {
                              toastError(error instanceof ApiError ? error.message : 'That file could not be downloaded');
                            }
                          }}
                        >
                          <i className="las la-paperclip" /> {attachment.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>

        {ticket.status === 3 ? (
          <p className="ticket-closed-note">
            This ticket is closed. Need more help?{' '}
            <Link href="/user/tickets" className="text--base">
              Open a new ticket
            </Link>
            .
          </p>
        ) : (
          <form
            className="ticket-reply"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);

              try {
                const { message } = await apiWithMessage(`/user/tickets/${ticketNumber}/reply`, {
                  method: 'POST',
                  auth: 'user',
                  body: { message: reply },
                });
                toastSuccess(message);
                setReply('');
                await load();
              } catch (error) {
                toastError(error instanceof ApiError ? error.message : 'Could not send your reply');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="form--label" htmlFor="ticket-reply">
              Reply
            </label>
            <textarea
              id="ticket-reply"
              className="form-control form--control"
              rows={4}
              required
              placeholder="Write a reply…"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
            />
            <div className="form-actions">
              <button
                className="btn btn-outline--danger"
                type="button"
                disabled={closing}
                onClick={async () => {
                  if (!window.confirm('Close this ticket? You can always open a new one.')) return;
                  setClosing(true);
                  try {
                    const { message } = await apiWithMessage(`/user/tickets/${ticketNumber}/close`, {
                      method: 'POST',
                      auth: 'user',
                    });
                    toastSuccess(message);
                    await load();
                  } catch (error) {
                    toastError(error instanceof ApiError ? error.message : 'Could not close this ticket');
                  } finally {
                    setClosing(false);
                  }
                }}
              >
                {closing ? 'Closing…' : 'Close ticket'}
              </button>
              <button className="btn btn--base" type="submit" disabled={busy}>
                <i className="las la-paper-plane" /> {busy ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
