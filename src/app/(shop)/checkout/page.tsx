import type { Metadata } from 'next';

import { CheckoutContent } from '@/components/checkout/CheckoutContent';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata: Metadata = { title: 'Checkout' };

export default function CheckoutPage() {
  return (
    <>
      <Breadcrumb title="Checkout" />
      <CheckoutContent />
    </>
  );
}
