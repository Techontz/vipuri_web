import type { Metadata } from 'next';

import { AccountProfile } from '@/components/account/AccountPages';

export const metadata: Metadata = { title: 'Profile Setting' };

export default function Page() {
  return <AccountProfile />;
}
