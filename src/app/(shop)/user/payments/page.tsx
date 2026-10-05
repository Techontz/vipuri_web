import type { Metadata } from 'next';

import { AccountPayments } from '@/components/account/AccountPages';

export const metadata: Metadata = { title: 'Payments' };

export default function Page() {
  return <AccountPayments />;
}
