import type { Metadata } from 'next';

import { AccountReviews } from '@/components/account/AccountPages';

export const metadata: Metadata = { title: 'Reviews' };

export default function Page() {
  return <AccountReviews />;
}
