import type { Metadata } from 'next';

import { AccountOrderDetail } from '@/components/account/AccountPages';

export const metadata: Metadata = { title: 'Order details' };

export default async function Page({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return <AccountOrderDetail orderNumber={orderNumber} />;
}
