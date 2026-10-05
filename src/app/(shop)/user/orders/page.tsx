import type { Metadata } from 'next';

import { AccountOrders } from '@/components/account/AccountPages';

export const metadata: Metadata = { title: 'My Orders' };

export default function Page() {
  return <AccountOrders />;
}
