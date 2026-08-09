import type { Metadata } from 'next';

import { AllCategories } from '@/components/product/AllCategories';

export const metadata: Metadata = { title: 'All Categories' };

export default function CategoriesPage() {
  return <AllCategories />;
}
