import type { Metadata } from 'next';

import { CartPageContent } from '@/components/cart/CartPageContent';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata: Metadata = {
  title: 'Shopping Cart',
  description: 'Review the parts in your VIPURI basket before checkout.',
};

export default function CartPage() {
  return (
    <>
      <Breadcrumb title="Shopping Cart" />
      <CartPageContent />
    </>
  );
}
