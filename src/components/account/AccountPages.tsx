'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { EmptyMessage } from '@/components/ui/EmptyMessage';
import { Pagination } from '@/components/ui/Pagination';
import { Rating } from '@/components/product/Rating';
import { useTranslate } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { ApiError, api, apiWithMessage, downloadFile } from '@/lib/api';
import { formatDate, imageUrl, showAmount } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Order, Pagination as PaginationMeta } from '@/types';

/* ------------------------------- Dashboard -------------------------------- */

type DashboardPayload = {
  widgets: Record<string, number>;
  recent_orders: Order[];
  total_spent: number;
  wishlist_count: number;
  unread_notifications: number;
};

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
    { label: 'Total orders', value: data?.widgets.order_total ?? 0, icon: 'las la-shopping-bag' },
    { label: 'Pending', value: data?.widgets.order_pending ?? 0, icon: 'las la-hourglass-half' },
    { label: 'Delivered', value: data?.widgets.order_delivered ?? 0, icon: 'las la-check-circle' },
    { label: 'Cancelled', value: data?.widgets.order_cancelled ?? 0, icon: 'las la-times-circle' },
  ];

  return (
    <>
      <div className="dashboard-header mb-4">
        <h4 className="mb-1">Karibu, {user?.firstname || user?.username}</h4>
        <p className="mb-0">Here is what is happening with your VIPURI account.</p>
      </div>

      <div className="row gy-4">
        {tiles.map((tile) => (
          <div className="col-sm-6 col-xl-3" key={tile.label}>
            <div className="dashboard-widget">
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

        <div className="col-sm-6 col-xl-6">
          <div className="dashboard-widget">
            <div className="dashboard-widget__icon">
              <i className="las la-wallet" />
            </div>
            <div className="dashboard-widget__content">
              <span className="dashboard-widget__label">Total spent</span>
              <h4 className="dashboard-widget__value">{showAmount(data?.total_spent ?? 0)}</h4>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-6">
          <div className="dashboard-widget">
            <div className="dashboard-widget__icon">
              <i className="las la-heart" />
            </div>
            <div className="dashboard-widget__content">
              <span className="dashboard-widget__label">Saved products</span>
              <h4 className="dashboard-widget__value">{data?.wishlist_count ?? 0}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="checkout-card mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="checkout-card__title mb-0">Recent orders</h5>
          <Link href="/user/orders" className="text--base">
            {t('View all')}
          </Link>
        </div>

        {(data?.recent_orders ?? []).length === 0 ? (
          <p className="mb-0">You have not placed an order yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table--responsive--md">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>{t('Date')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Payment')}</th>
                  <th className="text-end">{t('Total')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_orders ?? []).map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/user/orders/${order.order_number}`}>{order.order_number}</Link>
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      <span className="badge badge--base">{order.status_label}</span>
                    </td>
                    <td>{order.payment_status_label}</td>
                    <td className="text-end">{showAmount(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
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

  return (
    <>
      <div className="dashboard-header mb-4">
        <h4 className="mb-0">{t('My Orders')}</h4>
      </div>

      <ul className="nav-tab-list mb-4 d-flex flex-wrap gap-2">
        {ORDER_TABS.map((tab) => (
          <li key={tab.key}>
            <button
              type="button"
              className={`btn btn--sm ${status === tab.key ? 'btn--base' : 'btn-outline--base'}`}
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
          <div className="vp-skeleton vp-skeleton--line" />
        ) : orders.length === 0 ? (
          <EmptyMessage message="No orders found" action={{ label: 'Start shopping', href: '/products' }} />
        ) : (
          <div className="table-responsive">
            <table className="table table--responsive--md">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>{t('Date')}</th>
                  <th>{t('Branch')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Payment')}</th>
                  <th className="text-end">{t('Total')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{order.branch?.name ?? '—'}</td>
                    <td>
                      <span className="badge badge--base">{order.status_label}</span>
                    </td>
                    <td>{order.payment_status_label}</td>
                    <td className="text-end">{showAmount(order.total)}</td>
                    <td className="text-end">
                      <Link href={`/user/orders/${order.order_number}`} className="btn btn--sm btn-outline--base">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && pagination.last_page > 1 && (
        <div className="mt-4">
          <Pagination pagination={pagination} onChange={setPage} />
        </div>
      )}
    </>
  );
}

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

  if (loading) return <div className="vp-skeleton vp-skeleton--line" />;
  if (!order) return <EmptyMessage message="Order not found" action={{ label: 'My orders', href: '/user/orders' }} />;

  const address = order.shipping_address ?? {};
  const cancellable = [0, 1, 2].includes(order.status);

  return (
    <>
      <div className="dashboard-header mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Order {order.order_number}</h4>
          <p className="mb-0">Placed {formatDate(order.created_at, true)}</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge badge--base">{order.status_label}</span>
          <span className="badge badge--primary">{order.payment_status_label}</span>
          <button
            type="button"
            className="btn btn--sm btn-outline--base"
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
        </div>
      </div>

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
                {item.variation_label && <span style={{ fontSize: 13 }}>{item.variation_label}</span>}
              </div>
              <span className="checkout-item__price">{showAmount(item.subtotal)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="row gy-4 mt-1">
        <div className="col-md-6">
          <div className="checkout-card h-100">
            <h5 className="checkout-card__title">Delivery</h5>
            <p className="mb-0">
              {[address.firstname, address.lastname].filter(Boolean).join(' ')}
              <br />
              {address.address}
              <br />
              {[address.city, address.state].filter(Boolean).join(', ')}
              <br />
              {[address.dial_code, address.mobile].filter(Boolean).join(' ')}
            </p>
            {order.branch && <p className="mt-3 mb-0">Fulfilled by {order.branch.name}</p>}
            {order.shipping_method && <p className="mb-0">Method: {order.shipping_method}</p>}
          </div>
        </div>

        <div className="col-md-6">
          <div className="checkout-information h-100">
            <h5 className="title mb-3">Summary</h5>
            <ul className="checkout-information__list">
              <li>
                <span>{t('Subtotal')}</span> <span>{showAmount(order.subtotal)}</span>
              </li>
              {order.total_tax > 0 && (
                <li>
                  <span>{t('Tax')}</span> <span>{showAmount(order.total_tax)}</span>
                </li>
              )}
              <li>
                <span>Delivery</span> <span>{showAmount(order.shipping_charge)}</span>
              </li>
              {order.discount > 0 && (
                <li>
                  <span>{t('Discount')}</span> <span className="text--base">- {showAmount(order.discount)}</span>
                </li>
              )}
            </ul>
            <div className="checkout-information__total">
              <span>{t('Total')}</span> <span>{showAmount(order.total)}</span>
            </div>

            {order.payment_status !== 1 && !order.cod && order.status !== 7 && (
              <Link href={`/checkout/payment/${order.order_number}`} className="btn btn--base w-100 mt-3">
                Pay now
              </Link>
            )}

            {cancellable && (
              <button
                className="btn btn-outline--base w-100 mt-2"
                type="button"
                disabled={cancelling}
                onClick={async () => {
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
                }}
              >
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </button>
            )}
          </div>
        </div>
      </div>

      {(order.status_logs ?? []).length > 0 && (
        <div className="checkout-card mt-4">
          <h5 className="checkout-card__title">Progress</h5>
          <ul className="order-timeline">
            {(order.status_logs ?? []).map((log) => (
              <li className="order-timeline__item" key={log.id}>
                <div className="order-timeline__dot" />
                <div className="order-timeline__content">
                  <h6 className="mb-1">{log.to_status_label}</h6>
                  <span style={{ fontSize: 13 }}>{formatDate(log.created_at, true)}</span>
                  {log.remark && <p className="mb-0 mt-1">{log.remark}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
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
  title: 'Home',
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
  const [form, setForm] = useState({ ...EMPTY_ADDRESS });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ addresses: Address[] }>('/user/addresses', { auth: 'user' });
      setAddresses(data.addresses ?? []);
    } catch {
      setAddresses([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

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
      setForm({ ...EMPTY_ADDRESS });
      setEditingId(null);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not save the address');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="dashboard-header mb-4">
        <h4 className="mb-0">{t('Addresses')}</h4>
      </div>

      <div className="row gy-4">
        <div className="col-lg-7">
          {addresses.length === 0 ? (
            <div className="checkout-card">
              <p className="mb-0">You have not saved an address yet.</p>
            </div>
          ) : (
            addresses.map((address) => (
              <div className="checkout-card mb-3" key={address.id}>
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div>
                    <h6 className="mb-1">
                      {address.title} {address.is_default && <span className="badge badge--base">Default</span>}
                    </h6>
                    <p className="mb-0">
                      {address.firstname} {address.lastname}
                      <br />
                      {address.address}, {address.city}
                      <br />
                      {address.dial_code} {address.mobile}
                    </p>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn--sm btn-outline--base"
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
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn--sm btn-outline--danger"
                      type="button"
                      onClick={async () => {
                        try {
                          const { message } = await apiWithMessage(`/user/addresses/${address.id}`, {
                            method: 'DELETE',
                            auth: 'user',
                          });
                          toastSuccess(message);
                          await load();
                        } catch (error) {
                          toastError(error instanceof ApiError ? error.message : 'Could not remove the address');
                        }
                      }}
                    >
                      {t('Remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="col-lg-5">
          <div className="checkout-card">
            <h5 className="checkout-card__title">{editingId ? 'Edit address' : 'Add a new address'}</h5>
            <form onSubmit={submit}>
              <div className="row gy-3">
                <div className="col-12">
                  <label className="form--label">Label</label>
                  <input className="form-control form--control" required value={form.title} onChange={update('title')} />
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
                  <input className="form-control form--control" required value={form.mobile} onChange={update('mobile')} />
                </div>
                <div className="col-12">
                  <label className="form--label">Address</label>
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
                <div className="col-12 d-flex gap-2">
                  <button className="btn btn--base" type="submit" disabled={busy}>
                    {busy ? 'Saving…' : editingId ? 'Update address' : 'Save address'}
                  </button>
                  {editingId && (
                    <button
                      className="btn btn-outline--base"
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setForm({ ...EMPTY_ADDRESS });
                      }}
                    >
                      {t('Cancel')}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

/* --------------------------------- Reviews -------------------------------- */

type ReviewableProduct = { id: number; name: string; slug: string; image: string | null; reviewed: boolean };

export function AccountReviews() {
  const t = useTranslate();
  const [products, setProducts] = useState<ReviewableProduct[]>([]);
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
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <>
      <div className="dashboard-header mb-4">
        <h4 className="mb-1">{t('Reviews')}</h4>
        <p className="mb-0">Rate the parts you have received.</p>
      </div>

      {products.length === 0 ? (
        <EmptyMessage message="Nothing to review yet" action={{ label: 'Browse products', href: '/products' }} />
      ) : (
        <div className="row gy-4">
          {products.map((product) => (
            <div className="col-md-6" key={product.id}>
              <div className="checkout-card h-100 d-flex align-items-center gap-3">
                <img src={imageUrl(product.image)} alt={product.name} width={64} height={64} />
                <div className="flex-grow-1">
                  <h6 className="mb-1">
                    <Link href={`/product/${product.slug}`}>{product.name}</Link>
                  </h6>
                  {product.reviewed ? (
                    <span className="badge badge--success">Reviewed</span>
                  ) : (
                    <button className="btn btn--sm btn-outline--base" type="button" onClick={() => setSelected(product)}>
                      {t('Write a review')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="checkout-card mt-4">
          <h5 className="checkout-card__title">Review {selected.name}</h5>
          <form onSubmit={submit}>
            <div className="form-group mb-3">
              <label className="form--label">{t('Rating')}</label>
              <div className="d-flex gap-2 align-items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="btn btn--sm"
                    style={{ background: 'none', border: 0, padding: 0, fontSize: 22, color: star <= rating ? '#f7b500' : '#c4c4c4' }}
                    onClick={() => setRating(star)}
                    aria-label={`${star} star`}
                  >
                    <i className="las la-star" />
                  </button>
                ))}
                <Rating average={rating} showCount={false} />
              </div>
            </div>
            <div className="form-group mb-3">
              <label className="form--label">Your review</label>
              <textarea
                className="form-control form--control"
                rows={4}
                maxLength={2000}
                value={review}
                onChange={(event) => setReview(event.target.value)}
              />
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn--base" type="submit" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit review'}
              </button>
              <button className="btn btn-outline--base" type="button" onClick={() => setSelected(null)}>
                {t('Cancel')}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
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
  const t = useTranslate();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api<{ payments: PaymentRow[]; pagination: PaginationMeta }>(`/user/payments?page=${page}`, { auth: 'user' })
      .then((data) => {
        setRows(data.payments ?? []);
        setPagination(data.pagination ?? null);
      })
      .catch(() => setRows([]));
  }, [page]);

  return (
    <>
      <div className="dashboard-header mb-4">
        <h4 className="mb-0">Payment history</h4>
      </div>

      <div className="checkout-card">
        {rows.length === 0 ? (
          <p className="mb-0">No payments recorded yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table--responsive--md">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Order</th>
                  <th>Method</th>
                  <th>{t('Date')}</th>
                  <th>{t('Status')}</th>
                  <th className="text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.trx}</td>
                    <td>{row.order_number ?? '—'}</td>
                    <td>{row.method ?? '—'}</td>
                    <td>{formatDate(row.created_at)}</td>
                    <td>
                      <span className="badge badge--base">{row.status_label}</span>
                    </td>
                    <td className="text-end">{showAmount(row.final_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && pagination.last_page > 1 && (
        <div className="mt-4">
          <Pagination pagination={pagination} onChange={setPage} />
        </div>
      )}
    </>
  );
}

/* ------------------------------ Notifications ----------------------------- */

type NotificationRow = { id: number; title: string; click_url: string | null; is_read: boolean; created_at: string };

export function AccountNotifications() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api<{ notifications: NotificationRow[]; unread: number }>('/user/notifications', {
        auth: 'user',
      });
      setRows(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="dashboard-header mb-4 d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Notifications {unread > 0 && <span className="badge badge--base">{unread} new</span>}</h4>
        {unread > 0 && (
          <button
            className="btn btn--sm btn-outline--base"
            type="button"
            onClick={async () => {
              await api('/user/notifications/read-all', { method: 'POST', auth: 'user' });
              await load();
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="checkout-card">
        {rows.length === 0 ? (
          <p className="mb-0">Nothing here yet.</p>
        ) : (
          <ul className="notification-list">
            {rows.map((row) => (
              <li
                className="notification-list__item d-flex justify-content-between gap-3 py-3"
                key={row.id}
                style={{ borderBottom: '1px solid rgba(0,0,0,.06)' }}
              >
                <div>
                  <p className="mb-1" style={{ fontWeight: row.is_read ? 400 : 600 }}>
                    {row.title}
                  </p>
                  <span style={{ fontSize: 13 }}>{formatDate(row.created_at, true)}</span>
                </div>
                {!row.is_read && (
                  <button
                    className="btn btn--sm btn-outline--base"
                    type="button"
                    onClick={async () => {
                      await api(`/user/notifications/${row.id}/read`, { method: 'POST', auth: 'user' });
                      await load();
                    }}
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
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
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not update your profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="dashboard-header mb-4">
        <h4 className="mb-0">Profile setting</h4>
      </div>

      <div className="checkout-card">
        <form onSubmit={submit}>
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
              <input className="form-control form--control" value={form.mobile} onChange={update('mobile')} />
            </div>
            <div className="col-12">
              <label className="form--label">Address</label>
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
            <div className="col-12">
              <label className="form--label">Profile photo</label>
              <input
                className="form-control form--control"
                type="file"
                accept="image/*"
                onChange={(event) => setImage(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="col-12">
              <button className="btn btn--base" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
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
    <>
      <div className="dashboard-header mb-4">
        <h4 className="mb-0">Change password</h4>
      </div>

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
            <div className="col-12">
              <button className="btn btn--base" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Change password'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
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

const TICKET_STATUS: Record<number, string> = { 0: 'Open', 1: 'Answered', 2: 'Replied', 3: 'Closed' };

export function AccountTickets() {
  const t = useTranslate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [form, setForm] = useState({ subject: '', message: '', priority: '2' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ tickets: Ticket[] }>('/user/tickets', { auth: 'user' });
      setTickets(data.tickets ?? []);
    } catch {
      setTickets([]);
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
    <>
      <div className="dashboard-header mb-4">
        <h4 className="mb-0">Support</h4>
      </div>

      <div className="row gy-4">
        <div className="col-lg-7">
          <div className="checkout-card">
            <h5 className="checkout-card__title">Your tickets</h5>
            {tickets.length === 0 ? (
              <p className="mb-0">You have not opened a ticket yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table--responsive--md">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>{t('Subject')}</th>
                      <th>{t('Status')}</th>
                      <th>Last reply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>
                          <Link href={`/user/tickets/${ticket.ticket}`}>{ticket.ticket}</Link>
                        </td>
                        <td>{ticket.subject}</td>
                        <td>
                          <span className="badge badge--base">{TICKET_STATUS[ticket.status] ?? 'Open'}</span>
                        </td>
                        <td>{formatDate(ticket.last_reply ?? ticket.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="checkout-card">
            <h5 className="checkout-card__title">Open a ticket</h5>
            <form onSubmit={submit}>
              <div className="form-group mb-3">
                <label className="form--label">{t('Subject')}</label>
                <input
                  className="form-control form--control"
                  required
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                />
              </div>
              <div className="form-group mb-3">
                <label className="form--label">Priority</label>
                <select
                  className="form-select form--select"
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="1">Low</option>
                  <option value="2">Medium</option>
                  <option value="3">High</option>
                </select>
              </div>
              <div className="form-group mb-3">
                <label className="form--label">{t('Message')}</label>
                <textarea
                  className="form-control form--control"
                  rows={5}
                  required
                  value={form.message}
                  onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                />
              </div>
              <button className="btn btn--base w-100" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Create ticket'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export function AccountTicketDetail({ ticketNumber }: { ticketNumber: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<
    { id: number; message: string; from_admin: boolean; admin_name: string | null; created_at: string;
      attachments: { id: number; name: string }[] }[]
  >([]);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{
        ticket: Ticket;
        messages: { id: number; message: string; from_admin: boolean; admin_name: string | null; created_at: string;
      attachments: { id: number; name: string }[] }[];
      }>(`/user/tickets/${ticketNumber}`, { auth: 'user' });

      setTicket(data.ticket);
      setMessages(data.messages ?? []);
    } catch {
      setTicket(null);
    }
  }, [ticketNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ticket) return <EmptyMessage message="Ticket not found" action={{ label: 'Support', href: '/user/tickets' }} />;

  return (
    <>
      <div className="dashboard-header mb-4">
        <h4 className="mb-1">
          {ticket.ticket} — {ticket.subject}
        </h4>
        <span className="badge badge--base">{TICKET_STATUS[ticket.status] ?? 'Open'}</span>
      </div>

      <div className="checkout-card">
        <ul className="ticket-thread">
          {messages
            .slice()
            .reverse()
            .map((message) => (
              <li className="ticket-thread__item mb-3" key={message.id}>
                <div
                  className="p-3"
                  style={{
                    borderRadius: 10,
                    background: message.from_admin ? 'rgba(255,122,0,.08)' : 'rgba(0,0,0,.03)',
                  }}
                >
                  <div className="d-flex justify-content-between mb-2">
                    <strong>{message.from_admin ? message.admin_name ?? 'VIPURI Support' : 'You'}</strong>
                    <span style={{ fontSize: 13 }}>{formatDate(message.created_at, true)}</span>
                  </div>
                  <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
                    {message.message}
                  </p>

                  {message.attachments?.length > 0 && (
                    <ul className="ticket-attachments mt-3">
                      {message.attachments.map((attachment) => (
                        <li key={attachment.id}>
                          <button
                            type="button"
                            className="btn btn--sm btn-outline--base"
                            onClick={async () => {
                              try {
                                await downloadFile(`/user/attachments/${attachment.id}`, attachment.name, 'user');
                              } catch (error) {
                                toastError(
                                  error instanceof ApiError ? error.message : 'That file could not be downloaded',
                                );
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

        {ticket.status !== 3 && (
          <form
            className="mt-3"
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
            <textarea
              className="form-control form--control"
              rows={4}
              required
              placeholder="Write a reply…"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
            />
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn--base" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send reply'}
              </button>
              <button
                className="btn btn-outline--base"
                type="button"
                onClick={async () => {
                  await apiWithMessage(`/user/tickets/${ticketNumber}/close`, { method: 'POST', auth: 'user' });
                  await load();
                }}
              >
                Close ticket
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
