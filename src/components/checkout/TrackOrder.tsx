'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ApiError, api } from '@/lib/api';
import { formatDate } from '@/lib/format';

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
                  className="d-flex gap-2 mt-3"
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
                  <button className="btn btn--base" type="submit" disabled={busy}>
                    {busy ? 'Checking…' : 'Track'}
                  </button>
                </form>

                {error && <p className="text--danger mt-3 mb-0">{error}</p>}
              </div>

              {tracking && (
                <div className="checkout-card mt-4">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h5 className="checkout-card__title mb-0">{tracking.order_number}</h5>
                    <div className="d-flex gap-2">
                      <span className="badge badge--base">{tracking.status_label}</span>
                      <span className="badge badge--primary">{tracking.payment_status_label}</span>
                    </div>
                  </div>

                  {tracking.branch && <p className="mt-2 mb-0">Handled by {tracking.branch}</p>}

                  <ul className="order-timeline mt-4">
                    {tracking.timeline.map((step, index) => (
                      <li className="order-timeline__item" key={index}>
                        <div className="order-timeline__dot" />
                        <div className="order-timeline__content">
                          <h6 className="mb-1">{step.label}</h6>
                          <span style={{ fontSize: 13 }}>{formatDate(step.at, true)}</span>
                          {step.remark && <p className="mb-0 mt-1">{step.remark}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
