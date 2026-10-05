'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { useTranslate } from '@/components/providers/LanguageProvider';
import { ApiError, api } from '@/lib/api';
import { formatDate, imageUrl, showAmount } from '@/lib/format';
import { formatPlace, orderTone, paymentLabel, paymentTone } from '@/lib/status';
import type { Order } from '@/types';

/**
 * Order confirmation, mirroring `templates/basic/order_confirmation.blade.php`.
 * When the shopper has just returned from a gateway the payment is re-verified
 * with the provider before the page reports success.
 */
export function OrderConfirmation({ orderNumber }: { orderNumber: string }) {
  const t = useTranslate();
  const params = useSearchParams();
  const trx = params.get('trx');

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Returning from a gateway: confirm before reading the order so the
      // status shown is the verified one, never the one the URL claims.
      if (trx) {
        try {
          await api(`/payment/confirm/${trx}`, { cart: true, auth: 'user' });
        } catch {
          // The order still renders; the status simply stays unpaid.
        }
      }

      try {
        const data = await api<{ order: Order }>(`/orders/${orderNumber}/confirmation`, {
          cart: true,
          auth: 'user',
        });

        if (!cancelled) setOrder(data.order);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Order not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [orderNumber, trx]);

  if (loading) {
    return (
      <section className="my-120">
        <div className="container">
          <div className="vp-skeleton vp-skeleton--title" />
          <div className="vp-skeleton vp-skeleton--line" />
        </div>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="my-120">
        <div className="container text-center">
          <h3>We could not find that order</h3>
          <p className="mt-2">{error}</p>
          <Link href="/products" className="btn btn--base mt-3">
            Continue shopping
          </Link>
        </div>
      </section>
    );
  }

  const address = order.shipping_address ?? {};

  // Only call it confirmed once the money is in (or it is cash on delivery).
  const cancelled = order.status === 6 || order.status === 7;
  const settled = order.payment_status === 1 || order.cod;
  const underReview = order.payment_status === 2;
  // Once dispatched or delivered, payment is settled with VIPURI directly —
  // the same rule as the order page in the customer account.
  const shipped = order.status === 3 || order.status === 4;
  const canPay = !settled && !underReview && !cancelled && !shipped;

  const headline = cancelled
    ? 'This order was cancelled'
    : settled
      ? 'Thank you, your order is confirmed'
      : shipped
        ? order.status === 4
          ? 'Your order has been delivered'
          : 'Your order is on its way'
        : underReview
        ? 'Order placed — payment under review'
        : 'Order placed — awaiting payment';

  const tone = cancelled ? 'danger' : settled || shipped ? 'success' : underReview ? 'info' : 'warning';
  const icon = cancelled ? 'las la-times' : settled ? 'las la-check' : shipped ? 'las la-truck' : underReview ? 'las la-hourglass-half' : 'las la-clock';

  return (
    <section className="order-confirmation my-120">
      <div className="container">
        <div className="order-confirmation__header text-center">
          <span className={`order-confirmation__icon order-confirmation__icon--${tone}`} aria-hidden="true">
            <i className={icon} />
          </span>
          <h3 className="order-confirmation__title">{headline}</h3>
          <p className="order-confirmation__lead">
            Order <strong>{order.order_number}</strong> was placed on {formatDate(order.created_at, true)}.
            {canPay && ' Complete your payment so we can prepare it for dispatch.'}
          </p>
          <div className="order-confirmation__pills">
            <span className={`status-pill status-pill--${orderTone(order.status)}`}>Order: {order.status_label}</span>
            <span className={`status-pill status-pill--${order.cod ? 'info' : paymentTone(order.payment_status)}`}>
              Payment: {order.cod && order.payment_status !== 1 ? 'Cash on delivery' : paymentLabel(order.payment_status, order.payment_status_label)}
            </span>
            {order.branch && (
              <span className="order-confirmation__chip">
                <i className="las la-store" aria-hidden="true" /> Fulfilled by {order.branch.name}
              </span>
            )}
          </div>
          {canPay && (
            <Link href={`/checkout/payment/${order.order_number}`} className="btn btn--base order-confirmation__pay">
              Pay {showAmount(order.total)} now
            </Link>
          )}
        </div>

        <div className="row gy-4 mt-4">
          <div className="col-lg-8">
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
                      {item.variation_label && (
                        <span className="d-block" style={{ fontSize: 13 }}>
                          {item.variation_label}
                        </span>
                      )}
                      {item.sku && (
                        <span className="d-block" style={{ fontSize: 13 }}>
                          SKU: {item.sku}
                        </span>
                      )}
                    </div>
                    <span className="checkout-item__price">{showAmount(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="checkout-card mt-4">
              <h5 className="checkout-card__title">Delivery address</h5>
              <p className="mb-0">
                {[address.firstname, address.lastname].filter(Boolean).join(' ')}
                <br />
                {address.address}
                <br />
                {formatPlace(address.city, address.state)}
                <br />
                {address.country_name ?? 'Tanzania'}
                <br />
                {[address.dial_code, address.mobile].filter(Boolean).join(' ')}
                <br />
                {address.email}
              </p>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="checkout-information">
              <h5 className="checkout-card__title">Summary</h5>
              <ul className="checkout-information__list">
                <li>
                  <span>{t('Subtotal')}</span> <span>{showAmount(order.subtotal)}</span>
                </li>
                {order.total_tax > 0 && (
                  <li className="summary-vat">
                    <span>VAT (included)</span> <span>{showAmount(order.total_tax)}</span>
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
                {order.cod && (
                  <li>
                    <span>{t('Payment')}</span> <span>Cash on delivery</span>
                  </li>
                )}
              </ul>
              <div className="checkout-information__total">
                <span>{t('Total')}</span> <span>{showAmount(order.total)}</span>
              </div>

              <Link
                href={`/track-order?order=${order.order_number}`}
                className={`btn w-100 mt-3 ${canPay ? 'btn-outline--base' : 'btn--base'}`}
              >
                Track this order
              </Link>
              <Link href="/products" className="btn btn-outline--base w-100 mt-2">
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
