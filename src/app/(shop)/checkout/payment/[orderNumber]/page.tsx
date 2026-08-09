import type { Metadata } from 'next';

import { PaymentContent } from '@/components/checkout/PaymentContent';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata: Metadata = { title: 'Payment' };

export default async function PaymentPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return (
    <>
      <Breadcrumb title="Payment" />
      <PaymentContent orderNumber={orderNumber} />
    </>
  );
}
