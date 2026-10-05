import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SocialCallback } from '@/components/auth/SocialCallback';

export const metadata: Metadata = { title: 'Signing you in' };

export default function SocialCallbackPage() {
  return (
    <Suspense fallback={null}>
      <SocialCallback />
    </Suspense>
  );
}
