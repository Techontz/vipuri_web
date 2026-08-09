'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useTranslate } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useSettings } from '@/components/providers/AppProviders';
import { ApiError, api } from '@/lib/api';
import { imageUrl, showAmount } from '@/lib/format';
import { toastError } from '@/lib/toast';
import type { Order, ShippingRate } from '@/types';

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
  country_name: string | null;
  country_code: string | null;
  is_default: boolean;
};

type CheckoutPayload = {
  addresses: Address[];
  shipping_zones: { id: number; name: string }[];
  branches: { id: number; name: string; city: string | null; address: string | null; phone: string | null; is_pickup_point: boolean }[];
  has_cod: boolean;
};

const EMPTY_FORM = {
  firstname: '',
  lastname: '',
  email: '',
  dial_code: '+255',
  mobile: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country_name: 'Tanzania',
  country_code: 'TZ',
  note: '',
  save_address: true,
};

/**
 * Checkout. Mirrors `components/checkout/basic/checkout.blade.php`: the
 * delivery form on the left, order summary on the right, and the delivery
 * option / branch pickers the branch-aware VIPURI model needs.
 */
export function CheckoutContent() {
  const t = useTranslate();
  const router = useRouter();
  const settings = useSettings();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { items, summary, loading: cartLoading, chooseShippingRate, chooseBranch, refresh } = useCart();

  const [payload, setPayload] = useState<CheckoutPayload | null>(null);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [zoneId, setZoneId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [cod, setCod] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api<CheckoutPayload>('/checkout', { cart: true, auth: 'user' })
      .then((data) => {
        if (cancelled) return;
        setPayload(data);

        const preferred = data.addresses.find((address) => address.is_default) ?? data.addresses[0];

        if (preferred) {
          setForm((current) => ({
            ...current,
            firstname: preferred.firstname,
            lastname: preferred.lastname,
            email: preferred.email ?? '',
            dial_code: preferred.dial_code ?? '+255',
            mobile: preferred.mobile,
            address: preferred.address,
            city: preferred.city,
            state: preferred.state ?? '',
            zip: preferred.zip ?? '',
            save_address: false,
          }));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  // Prefill from the signed-in account when there is no saved address.
  useEffect(() => {
    if (!user) return;

    setForm((current) => ({
      ...current,
      firstname: current.firstname || (user.firstname ?? ''),
      lastname: current.lastname || (user.lastname ?? ''),
      email: current.email || user.email,
      mobile: current.mobile || (user.mobile ?? ''),
      dial_code: current.dial_code || (user.dial_code ?? '+255'),
      city: current.city || (user.city ?? ''),
      address: current.address || (user.address ?? ''),
    }));
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    api<{ rates: ShippingRate[] }>(`/cart/shipping-rates${zoneId ? `?zone_id=${zoneId}` : ''}`, {
      cart: true,
      auth: 'user',
    })
      .then((data) => {
        if (!cancelled) setRates(data.rates ?? []);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [zoneId, summary.subtotal]);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const placeOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!summary.shipping_rate_id) {
      toastError('Please choose a delivery option');
      return;
    }

    setSubmitting(true);

    try {
      const data = await api<{ order: Order; requires_payment: boolean }>('/checkout', {
        method: 'POST',
        cart: true,
        auth: 'user',
        body: { ...form, cod, branch_id: summary.branch_id },
      });

      await refresh();

      router.push(
        data.requires_payment
          ? `/checkout/payment/${data.order.order_number}`
          : `/order-confirmation/${data.order.order_number}`,
      );
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Your order could not be placed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!cartLoading && items.length === 0) {
    return (
      <section className="my-120">
        <div className="container">
          <div className="empty-message">
            <div className="empty-message-icon">
              <img src="/assets/images/empty_cart.png" alt="img" />
            </div>
            <p className="empty-message-text">{t('Your cart is empty')}</p>
            <Link href="/products" className="btn btn-outline--base btn--sm mt-3">
              View Products
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout my-120">
      <div className="container large-container">
        <div className="row gy-4">
          <div className="col-lg-7">
            <form className="checkout-form" onSubmit={placeOrder} id="checkoutForm">
              <div className="checkout-card">
                <h5 className="checkout-card__title">Delivery Details</h5>

                {!authLoading && !isAuthenticated && (
                  <p className="mb-4">
                    Already have an account?{' '}
                    <Link href={`/login?redirect=${encodeURIComponent('/checkout')}`} className="text--base">
                      Sign in
                    </Link>{' '}
                    to use your saved addresses.
                  </p>
                )}

                {payload && payload.addresses.length > 0 && (
                  <div className="form-group mb-4">
                    <label className="form--label">Use a saved address</label>
                    <select
                      className="form-select form--select"
                      onChange={(event) => {
                        const address = payload.addresses.find((row) => row.id === Number(event.target.value));
                        if (!address) return;

                        setForm((current) => ({
                          ...current,
                          firstname: address.firstname,
                          lastname: address.lastname,
                          email: address.email ?? current.email,
                          dial_code: address.dial_code ?? '+255',
                          mobile: address.mobile,
                          address: address.address,
                          city: address.city,
                          state: address.state ?? '',
                          zip: address.zip ?? '',
                          save_address: false,
                        }));
                      }}
                    >
                      <option value="">Choose an address</option>
                      {payload.addresses.map((address) => (
                        <option value={address.id} key={address.id}>
                          {address.title} — {address.address}, {address.city}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                    <input className="form-control form--control" type="email" required value={form.email} onChange={update('email')} />
                  </div>
                  <div className="col-sm-6">
                    <label className="form--label">{t('Mobile')}</label>
                    <div className="input-group input--group">
                      <span className="input-group-text">{form.dial_code}</span>
                      <input className="form-control form--control" required value={form.mobile} onChange={update('mobile')} />
                    </div>
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
                    <label className="form--label">Order note (optional)</label>
                    <textarea className="form-control form--control" rows={3} value={form.note} onChange={update('note')} />
                  </div>

                  {isAuthenticated && (
                    <div className="col-12">
                      <div className="form-check form--check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="save-address"
                          checked={form.save_address}
                          onChange={(event) => setForm((current) => ({ ...current, save_address: event.target.checked }))}
                        />
                        <label className="form-check-label" htmlFor="save-address">
                          Save this address for next time
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* -------------------- Branch / collection -------------------- */}
              {payload && payload.branches.length > 0 && (
                <div className="checkout-card mt-4">
                  <h5 className="checkout-card__title">Fulfilling branch</h5>
                  <p className="mb-3">
                    Choose where your order is picked and packed. Leave it on automatic and VIPURI will use the branch
                    that can fulfil your whole basket.
                  </p>
                  <select
                    className="form-select form--select"
                    value={summary.branch_id ?? ''}
                    onChange={(event) => void chooseBranch(event.target.value ? Number(event.target.value) : null)}
                  >
                    <option value="">Automatic — nearest branch with stock</option>
                    {payload.branches.map((branch) => (
                      <option value={branch.id} key={branch.id}>
                        {branch.name}
                        {branch.city ? ` — ${branch.city}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ------------------------- Delivery -------------------------- */}
              <div className="checkout-card mt-4">
                <h5 className="checkout-card__title">Delivery option</h5>

                {payload && payload.shipping_zones.length > 0 && (
                  <div className="form-group mb-3">
                    <label className="form--label">Delivery zone</label>
                    <select
                      className="form-select form--select"
                      value={zoneId}
                      onChange={(event) => setZoneId(event.target.value)}
                    >
                      <option value="">All zones</option>
                      {payload.shipping_zones.map((zone) => (
                        <option value={zone.id} key={zone.id}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {rates.length === 0 ? (
                  <p className="mb-0">No delivery option is available for this basket yet.</p>
                ) : (
                  <ul className="shipping-rate-list">
                    {rates.map((rate) => (
                      <li key={rate.id}>
                        <label className="form-check form--check d-flex align-items-center gap-2 py-2">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="shipping_rate"
                            checked={summary.shipping_rate_id === rate.id}
                            onChange={() => void chooseShippingRate(rate.id)}
                          />
                          <span className="form-check-label flex-grow-1">
                            <strong>{rate.method.name}</strong>
                            <span className="d-block" style={{ fontSize: 13 }}>
                              {rate.zone.name}
                              {rate.expected_delivery_days > 0
                                ? ` · about ${rate.expected_delivery_days} day${rate.expected_delivery_days === 1 ? '' : 's'}`
                                : ''}
                            </span>
                          </span>
                          <strong>{rate.amount > 0 ? showAmount(rate.amount) : 'Free'}</strong>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* -------------------------- Payment -------------------------- */}
              {(payload?.has_cod ?? settings?.site.has_cod) && (
                <div className="checkout-card mt-4">
                  <h5 className="checkout-card__title">{t('Payment')}</h5>
                  <div className="form-check form--check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="payment_mode"
                      id="pay-online"
                      checked={!cod}
                      onChange={() => setCod(false)}
                    />
                    <label className="form-check-label" htmlFor="pay-online">
                      Pay now (M-Pesa, Tigo Pesa, Airtel Money, card or bank transfer)
                    </label>
                  </div>
                  <div className="form-check form--check mt-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="payment_mode"
                      id="pay-cod"
                      checked={cod}
                      onChange={() => setCod(true)}
                    />
                    <label className="form-check-label" htmlFor="pay-cod">
                      Cash on delivery
                    </label>
                  </div>
                </div>
              )}

              <button className="btn btn--base w-100 mt-4" type="submit" disabled={submitting}>
                {submitting ? 'Placing your order…' : cod ? 'Place order' : 'Continue to payment'}
              </button>
            </form>
          </div>

          {/* --------------------------- Summary --------------------------- */}
          <div className="col-lg-5">
            <div className="checkout-information">
              <h5 className="title mb-3">Your order</h5>

              <ul className="checkout-item-list">
                {items.map((item) => (
                  <li className="checkout-item" key={item.id}>
                    <div className="checkout-item__thumb">
                      <img src={imageUrl(item.product_image)} alt={item.product_name ?? 'product'} />
                      <span className="checkout-item__qty">{item.quantity}</span>
                    </div>
                    <div className="checkout-item__content">
                      <h6 className="checkout-item__title">{item.product_name}</h6>
                      {Object.entries(item.variations ?? {}).map(([label, value]) => (
                        <span className="checkout-item__variation d-block" key={label} style={{ fontSize: 13 }}>
                          {label}: {value}
                        </span>
                      ))}
                    </div>
                    <span className="checkout-item__price">{showAmount(item.subtotal)}</span>
                  </li>
                ))}
              </ul>

              <ul className="checkout-information__list mt-3">
                <li>
                  <span>{t('Subtotal')}</span> <span>{showAmount(summary.subtotal)}</span>
                </li>
                {summary.total_tax > 0 && (
                  <li>
                    <span>{t('Tax')}</span> <span>{showAmount(summary.total_tax)}</span>
                  </li>
                )}
                <li>
                  <span>Delivery</span>{' '}
                  <span>{summary.shipping_charge > 0 ? showAmount(summary.shipping_charge) : '—'}</span>
                </li>
                {summary.coupon && (
                  <li>
                    <span>
                      Coupon <span className="fw-bold">{summary.coupon.code}</span>
                    </span>
                    <span className="text--base">- {showAmount(summary.discount)}</span>
                  </li>
                )}
              </ul>

              <div className="checkout-information__total">
                <span>{t('Total')}</span> <span>{showAmount(summary.payable)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
