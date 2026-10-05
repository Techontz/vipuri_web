import type { Metadata } from 'next';
import { Suspense } from 'react';

import { TrackOrder } from '@/components/checkout/TrackOrder';

export const metadata: Metadata = {
  title: 'Track Order',
  description: 'Follow your VIPURI order from our branch to your door.',
};

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrder />
    </Suspense>
  );
}
