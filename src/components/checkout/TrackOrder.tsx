'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ApiError, api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { orderTone, paymentTone } from '@/lib/status';

type Tracking = {
  order_number: string;
  status: number;
  status_label: string;
  payment_status: number;
  payment_status_label: string;
  branch: string | null;
  placed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  timeline: { status: number; label: string; remark: string | null; at: string }[];
};

/**
 * The remark, when it says more than the status label. The system writes a
 * generic remark for each status ("Pending" → "Order placed"), which only
 * repeated the label; staff-written notes are kept.
 */
const GENERIC_REMARKS = new Set([
  'order placed',
  'order confirmed',
  'order processing',
  'order dispatched',
  'order shipped',
  'order delivered',
  'order cancelled',
  'order canceled',
  'status updated',
]);

function usefulRemark(label: string, remark: string | null): string | null {
  const text = (remark ?? '').trim();
  if (!text) return null;

  const norm = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const r = norm(text);
  const l = norm(label);

  if (r === l || r === `order ${l}` || GENERIC_REMARKS.has(r)) return null;

  return text;
}

/** Public order tracking, mirroring `templates/basic/track_order.blade.php`. */
export function TrackOrder() {
  const params = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get('order') ?? '');
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = useCallback(async (value: string) => {
    if (!value.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const data = await api<Tracking>(`/orders/${encodeURIComponent(value.trim())}/track`);
      setTracking(data);
    } catch (err) {
      setTracking(null);
      setError(err instanceof ApiError ? err.message : 'No order found with this number');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const initial = params.get('order');
    if (initial) void lookup(initial);
  }, [params, lookup]);

  return (
    <>
      <Breadcrumb title="Track Order" />

      <section className="track-order my-120">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="checkout-card">
                <h5 className="checkout-card__title">Where is my order?</h5>
                <p>Enter the order number from your confirmation e-mail or SMS.</p>

                <form
                  className="track-form mt-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void lookup(orderNumber);
                  }}
                >
                  <input
                    className="form-control form--control"
                    placeholder="e.g. VP260809ABCDEF"
                    value={orderNumber}
                    onChange={(event) => setOrderNumber(event.target.value)}
                  />
                  <button className="btn btn--base track-form__btn" type="submit" disabled={busy}>
                    <i className="las la-search" /> {busy ? 'Checking…' : 'Track order'}
                  </button>
                </form>

                {error && <p className="text--danger mt-3 mb-0">{error}</p>}
              </div>

              {tracking && (
                <div className="checkout-card mt-4">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h5 className="checkout-card__title mb-0">{tracking.order_number}</h5>
                    <div className="d-flex flex-wrap gap-2">
                      <span className={`status-pill status-pill--${orderTone(tracking.status)}`}>
                        Order: {tracking.status_label}
                      </span>
                      <span className={`status-pill status-pill--${paymentTone(tracking.payment_status)}`}>
                        Payment: {tracking.payment_status_label}
                      </span>
                    </div>
                  </div>

                  {tracking.branch && <p className="mt-2 mb-0">Handled by {tracking.branch}</p>}
                  <ol className="order-timeline track-timeline mt-4">
                    {tracking.timeline.map((step, index) => {
                      const current = index === tracking.timeline.length - 1;
                      const remark = usefulRemark(step.label, step.remark);

                      return (
                        <li
                          className={`order-timeline__item${current ? ' is-current' : ''}`}
                          key={index}
                          aria-current={current ? 'step' : undefined}
                        >
                          <div className="order-timeline__dot" />
                          <div className="order-timeline__content">
                            <h6 className="track-timeline__label">
                              {step.label}
                              {current && <span className="track-timeline__now">Latest</span>}
                            </h6>
                            <span className="track-timeline__time">{formatDate(step.at, true)}</span>
                            {remark && <p className="track-timeline__remark">{remark}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
