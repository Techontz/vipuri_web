import type { Metadata } from 'next';

import { AccountChangePassword } from '@/components/account/AccountPages';

export const metadata: Metadata = { title: 'Change Password' };

export default function Page() {
  return <AccountChangePassword />;
}
