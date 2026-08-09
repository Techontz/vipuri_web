import type { Metadata } from 'next';

import { AccountDashboard } from '@/components/account/AccountPages';

export const metadata: Metadata = { title: 'Dashboard' };

export default function Page() {
  return <AccountDashboard />;
}
