'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { useTranslate } from '@/components/providers/LanguageProvider';
import { ApiError, api } from '@/lib/api';
import { formatDate, imageUrl, showAmount } from '@/lib/format';
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

  return (
    <section className="order-confirmation my-120">
      <div className="container">
        <div className="order-confirmation__header text-center">
          <img src="/assets/templates/basic/images/order-completed.gif" alt="Order placed" width={140} height={140} />
          <h3 className="mt-3">Thank you, your order is confirmed</h3>
          <p className="mt-2">
            Order <strong>{order.order_number}</strong> was placed on {formatDate(order.created_at, true)}.
          </p>
          <div className="d-flex gap-2 justify-content-center mt-3 flex-wrap">
            <span className="badge badge--base">{order.status_label}</span>
            <span className="badge badge--primary">{order.payment_status_label}</span>
            {order.branch && <span className="badge badge--info">Fulfilled by {order.branch.name}</span>}
          </div>
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
                {[address.city, address.state].filter(Boolean).join(', ')}
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
                {order.cod && (
                  <li>
                    <span>{t('Payment')}</span> <span>Cash on delivery</span>
                  </li>
                )}
              </ul>
              <div className="checkout-information__total">
                <span>{t('Total')}</span> <span>{showAmount(order.total)}</span>
              </div>

              <Link href={`/track-order?order=${order.order_number}`} className="btn btn--base w-100 mt-3">
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
