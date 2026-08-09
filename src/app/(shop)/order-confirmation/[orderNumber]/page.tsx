import type { Metadata } from 'next';

import { OrderConfirmation } from '@/components/checkout/OrderConfirmation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata: Metadata = { title: 'Order Confirmation' };

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return (
    <>
      <Breadcrumb title={`Order Confirmation - ${orderNumber}`} />
      <OrderConfirmation orderNumber={orderNumber} />
    </>
  );
}
