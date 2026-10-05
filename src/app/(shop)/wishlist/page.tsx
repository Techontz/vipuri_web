import type { Metadata } from 'next';

import { WishlistContent } from '@/components/product/WishlistContent';

export const metadata: Metadata = { title: 'Wishlist' };

export default function WishlistPage() {
  return <WishlistContent />;
}
