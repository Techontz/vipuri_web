'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useTranslate } from '@/components/providers/LanguageProvider';
import { ApiError, api } from '@/lib/api';
import { showAmount } from '@/lib/format';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Order } from '@/types';

type PaymentMethod = {
  id: number;
  name: string;
  gateway_alias: string;
  currency: string;
  symbol: string | null;
  image: string | null;
  is_manual: boolean;
  description: string | null;
  min_amount: number;
  max_amount: number;
  percent_charge: number;
  fixed_charge: number;
  rate: number;
};

type GatewayField = { title: string; type: string; validation?: string };

type MobileMoneyRequest = { trx: string; push_sent: boolean; network: string; phone: string; amount: number };

/** Mobile prefixes (after 255) by network — mirrors App\Support\MobileMoney. */
const NETWORKS: { name: string; prefixes: string[] }[] = [
  { name: 'M-Pesa (Vodacom)', prefixes: ['74', '75', '76'] },
  { name: 'Mixx by Yas (Tigo Pesa)', prefixes: ['65', '67', '71', '77'] },
  { name: 'Airtel Money', prefixes: ['68', '69', '78'] },
  { name: 'HaloPesa (Halotel)', prefixes: ['61', '62'] },
  { name: 'T-Pesa (TTCL)', prefixes: ['73'] },
];

/** The 9 digits after +255, from whatever the customer typed. */
function localDigits(input: string): string {
  let digits = input.replace(/\D+/g, '');
  if (digits.startsWith('255')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 9);
}

function detectNetwork(digits: string): string | null {
  const prefix = digits.slice(0, 2);
  return NETWORKS.find((network) => network.prefixes.includes(prefix))?.name ?? null;
}

/**
 * Payment step.
 *
 * Customers pay by mobile money with just their phone number: the network is
 * recognised from the number, so there is no M-Pesa / Tigo Pesa / Airtel Money
 * list to choose from. Until a USSD-push provider is connected the request is
 * queued for VIPURI to collect and confirm (`push_sent: false`). Bank transfer
 * stays available as the one alternative, using the proof-of-payment form.
 */
export function PaymentContent({ orderNumber }: { orderNumber: string }) {
  const t = useTranslate();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [manual, setManual] = useState<{ trx: string; instructions: string | null; fields: Record<string, GatewayField> } | null>(null);
  const [detail, setDetail] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState('');
  const [request, setRequest] = useState<MobileMoneyRequest | null>(null);

  useEffect(() => {
    let cancelled = false;

    api<{ order: Order; methods: PaymentMethod[] }>(`/checkout/${orderNumber}/payment-methods`, {
      cart: true,
      auth: 'user',
    })
      .then((data) => {
        if (cancelled) return;
        setOrder(data.order);
        setMethods(data.methods ?? []);
        setSelected(data.methods?.find((method) => method.gateway_alias === 'bank-transfer') ?? null);

        // Start from the number the order was placed with.
        const known = data.order.shipping_address?.mobile ?? data.order.customer?.mobile ?? data.order.guest?.mobile ?? '';
        setPhone(localDigits(known));
      })
      .catch((error) => {
        if (!cancelled) toastError(error instanceof ApiError ? error.message : 'Could not load payment methods');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  const startPayment = async () => {
    if (!selected) return;

    setBusy(true);

    try {
      const data = await api<{
        type: string;
        redirect_url: string | null;
        fields: Record<string, GatewayField> | null;
        instructions: string | null;
        trx: string;
      }>(`/checkout/${orderNumber}/pay`, {
        method: 'POST',
        cart: true,
        auth: 'user',
        body: { gateway_currency_id: selected.id },
      });

      if (data.type === 'redirect' && data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }

      setManual({ trx: data.trx, instructions: data.instructions, fields: data.fields ?? {} });
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Payment could not be started');
    } finally {
      setBusy(false);
    }
  };

  const digits = localDigits(phone);
  const network = digits.length >= 2 ? detectNetwork(digits) : null;
  const phoneValid = digits.length === 9 && network !== null;
  const mobileMoneyAvailable = methods.some((method) => /mpesa|tigopesa|airtelmoney/.test(method.gateway_alias));

  const requestMobileMoney = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!phoneValid) return;

    setBusy(true);

    try {
      const data = await api<MobileMoneyRequest>(`/checkout/${orderNumber}/mobile-money`, {
        method: 'POST',
        cart: true,
        auth: 'user',
        body: { phone: `+255${digits}` },
      });

      setRequest(data);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not send the payment request');
    } finally {
      setBusy(false);
    }
  };

  const submitManual = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!manual) return;

    setBusy(true);

    try {
      await api(`/payment/manual/${manual.trx}`, {
        method: 'POST',
        cart: true,
        auth: 'user',
        body: { detail },
      });

      toastSuccess('Your payment is under review');
      router.push(`/order-confirmation/${orderNumber}`);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not submit your payment');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="my-120">
        <div className="container">
          <div className="vp-skeleton vp-skeleton--title" />
          <div className="vp-skeleton vp-skeleton--line" />
          <div className="vp-skeleton vp-skeleton--line" />
        </div>
      </section>
    );
  }

  return (
    <section className="payment my-120">
      <div className="container">
        <div className="row gy-4 justify-content-center">
          <div className="col-lg-7">
            <div className="checkout-card">
              {request ? (
                <div className="momo-result">
                  <span className="momo-result__icon">
                    <i className={request.push_sent ? 'las la-mobile' : 'las la-check'} />
                  </span>
                  {request.push_sent ? (
                    <>
                      <h5 className="momo-result__title">Check your phone</h5>
                      <p className="momo-result__desc">
                        We sent a {request.network} payment prompt to <strong>{request.phone}</strong>. Enter your PIN to
                        pay <strong>{showAmount(request.amount)}</strong>.
                      </p>
                    </>
                  ) : (
                    <>
                      <h5 className="momo-result__title">Payment request received</h5>
                      <p className="momo-result__desc">
                        We have your {request.network} number <strong>{request.phone}</strong> for{' '}
                        <strong>{showAmount(request.amount)}</strong>. VIPURI will confirm your payment and update your
                        order — you will be notified as soon as it is confirmed.
                      </p>
                    </>
                  )}
                  <span className="momo-result__ref">Reference: {request.trx}</span>
                  <button
                    className="btn btn--base w-100 mt-4"
                    type="button"
                    onClick={() => router.push(`/order-confirmation/${orderNumber}`)}
                  >
                    View my order
                  </button>
                </div>
              ) : manual ? (
                <form onSubmit={submitManual}>
                  <h5 className="checkout-card__title">Pay by bank transfer</h5>
                  {manual.instructions && (
                    <div
                      className="payment-instructions mb-4"
                      style={{ whiteSpace: 'pre-line' }}
                      dangerouslySetInnerHTML={{ __html: manual.instructions }}
                    />
                  )}

                  {Object.entries(manual.fields).map(([key, field]) => (
                    <div className="form-group mb-3" key={key}>
                      <label className="form--label">{field.title}</label>
                      <input
                        className="form-control form--control"
                        type="text"
                        required={field.validation === 'required'}
                        value={detail[key] ?? ''}
                        onChange={(event) => setDetail((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    </div>
                  ))}

                  <button className="btn btn--base w-100" type="submit" disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit payment for review'}
                  </button>
                  <button className="btn btn-link w-100 mt-2 momo-switch" type="button" onClick={() => setManual(null)}>
                    Pay with mobile money instead
                  </button>
                </form>
              ) : mobileMoneyAvailable ? (
                <form onSubmit={requestMobileMoney}>
                  <h5 className="checkout-card__title">Pay with mobile money</h5>
                  <p className="momo-lead">
                    Enter your phone number and confirm the payment on your phone. M-Pesa, Mixx by Yas, Airtel Money and
                    HaloPesa are all accepted.
                  </p>

                  <label className="form--label" htmlFor="momo-phone">
                    Phone number
                  </label>
                  <div className="input-group input--group momo-phone">
                    <span className="input-group-text">+255</span>
                    <input
                      id="momo-phone"
                      className="form-control form--control"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="754 123 456"
                      required
                      value={phone}
                      onChange={(event) => setPhone(localDigits(event.target.value))}
                    />
                  </div>
                  <div className="momo-network">
                    {network ? (
                      <span className="momo-network__badge">
                        <i className="las la-sim-card" /> {network}
                      </span>
                    ) : digits.length >= 2 ? (
                      <span className="momo-network__error">This does not look like a Tanzanian mobile number</span>
                    ) : null}
                  </div>

                  <button className="btn btn--base w-100 mt-3" type="submit" disabled={busy || !phoneValid}>
                    {busy ? 'Sending request…' : `Pay ${showAmount(order?.total ?? 0)}`}
                  </button>

                  {selected && (
                    <button className="btn btn-link w-100 mt-2 momo-switch" type="button" onClick={startPayment} disabled={busy}>
                      Pay by bank transfer instead
                    </button>
                  )}
                </form>
              ) : (
                <p className="mb-0">
                  No payment method is currently available. Please contact VIPURI support and we will take your payment
                  another way.
                </p>
              )}
            </div>
          </div>

          <div className="col-lg-5">
            <div className="checkout-information">
              <h5 className="checkout-card__title mb-1">Order summary</h5>
              <p className="checkout-information__sub">Order {order?.order_number ?? orderNumber}</p>

              <ul className="checkout-information__list">
                <li>
                  <span>{t('Subtotal')}</span> <span>{showAmount(order?.subtotal ?? 0)}</span>
                </li>
                {(order?.total_tax ?? 0) > 0 && (
                  <li className="summary-vat">
                    <span>VAT (included)</span> <span>{showAmount(order?.total_tax ?? 0)}</span>
                  </li>
                )}
                <li>
                  <span>Delivery</span> <span>{showAmount(order?.shipping_charge ?? 0)}</span>
                </li>
                {(order?.discount ?? 0) > 0 && (
                  <li>
                    <span>{t('Discount')}</span> <span className="text--base">- {showAmount(order?.discount ?? 0)}</span>
                  </li>
                )}
              </ul>

              <div className="checkout-information__total">
                <span>{t('Total')}</span> <span>{showAmount(order?.total ?? 0)}</span>
              </div>

              <Link href={`/order-confirmation/${orderNumber}`} className="btn btn-outline--base w-100 mt-3">
                View order
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
