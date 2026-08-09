import type { Metadata } from 'next';

import { AccountNotifications } from '@/components/account/AccountPages';

export const metadata: Metadata = { title: 'Notifications' };

export default function Page() {
  return <AccountNotifications />;
}
