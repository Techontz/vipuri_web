import type { Metadata } from 'next';

import { AccountTickets } from '@/components/account/AccountPages';

export const metadata: Metadata = { title: 'Support' };

export default function Page() {
  return <AccountTickets />;
}
