import type { Metadata } from 'next';

import { AllBrands } from '@/components/product/AllBrands';

export const metadata: Metadata = {
  title: 'Brands',
  description: 'Every parts and accessories brand stocked by VIPURI.',
};

export default function BrandsPage() {
  return <AllBrands />;
}
