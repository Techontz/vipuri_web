'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useTranslate } from '@/components/providers/LanguageProvider';
import { ApiError, api } from '@/lib/api';
import { imageUrl, showAmount } from '@/lib/format';
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

/**
 * Payment step, mirroring `components/payment/basic/payment.blade.php`.
 *
 * Automatic gateways redirect to the provider; manual gateways (M-Pesa, Tigo
 * Pesa, Airtel Money, bank transfer) show the instructions plus the proof-of-
 * payment form the administrator will review.
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
        setSelected(data.methods?.[0] ?? null);
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

  const charge = selected ? selected.fixed_charge + ((order?.total ?? 0) * selected.percent_charge) / 100 : 0;

  return (
    <section className="payment my-120">
      <div className="container">
        <div className="row gy-4 justify-content-center">
          <div className="col-lg-7">
            <div className="checkout-card">
              <h5 className="checkout-card__title">Choose how to pay</h5>

              {methods.length === 0 ? (
                <p className="mb-0">
                  No payment method is currently available. Please contact VIPURI support and we will take your payment
                  another way.
                </p>
              ) : manual ? (
                <form onSubmit={submitManual}>
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
                        type={field.type === 'file' ? 'text' : 'text'}
                        required={field.validation === 'required'}
                        value={detail[key] ?? ''}
                        onChange={(event) => setDetail((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    </div>
                  ))}

                  <button className="btn btn--base w-100" type="submit" disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit payment for review'}
                  </button>
                </form>
              ) : (
                <>
                  <ul className="payment-method-list">
                    {methods.map((method) => (
                      <li key={method.id}>
                        <label className="form-check form--check d-flex align-items-center gap-3 py-3">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="gateway"
                            checked={selected?.id === method.id}
                            onChange={() => setSelected(method)}
                          />
                          {method.image && (
                            <img src={imageUrl(method.image)} alt={method.name} width={48} height={32} />
                          )}
                          <span className="flex-grow-1">
                            <strong>{method.name}</strong>
                            {method.is_manual && (
                              <span className="d-block" style={{ fontSize: 13 }}>
                                Confirmed by VIPURI after you send the payment
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>

                  {selected && charge > 0 && (
                    <p className="mt-3 mb-0">
                      Processing charge: <strong>{showAmount(charge)}</strong>
                    </p>
                  )}

                  <button className="btn btn--base w-100 mt-4" type="button" onClick={startPayment} disabled={busy || !selected}>
                    {busy ? 'Starting…' : `Pay ${showAmount((order?.total ?? 0) + charge)}`}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="col-lg-5">
            <div className="checkout-information">
              <h5 className="title mb-3">Order {order?.order_number}</h5>

              <ul className="checkout-information__list">
                <li>
                  <span>{t('Subtotal')}</span> <span>{showAmount(order?.subtotal ?? 0)}</span>
                </li>
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
