import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ProductListing } from '@/components/product/ProductListing';

export const metadata: Metadata = {
  title: 'Shop Auto Parts & Accessories',
  description:
    'Browse genuine auto parts and vehicle accessories at VIPURI. Filter by vehicle, category, brand, price and branch availability.',
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductListingFallback />}>
      <ProductListing />
    </Suspense>
  );
}

function ProductListingFallback() {
  return (
    <section className="my-120">
      <div className="container">
        <div className="row gy-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="col-xsm-6 col-sm-6 col-lg-4 col-xxl-3" key={index}>
              <div className="vp-skeleton vp-skeleton--card" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
