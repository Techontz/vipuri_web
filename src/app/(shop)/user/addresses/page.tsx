import type { Metadata } from 'next';

import { AccountAddresses } from '@/components/account/AccountPages';

export const metadata: Metadata = { title: 'Addresses' };

export default function Page() {
  return <AccountAddresses />;
}
