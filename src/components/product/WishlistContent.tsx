'use client';

import Link from 'next/link';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ProductCard } from '@/components/product/ProductCard';
import { useCart } from '@/components/providers/CartProvider';

/** Wishlist page, mirroring `templates/basic/wishlist.blade.php`. */
export function WishlistContent() {
  const { wishlist, loading } = useCart();

  return (
    <>
      <Breadcrumb title="Wishlist" />

      <section className="wishlist my-120">
        <div className="container">
          {loading ? (
            <div className="row gy-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="col-xsm-6 col-sm-6 col-lg-4 col-xxl-3" key={index}>
                  <div className="vp-skeleton vp-skeleton--card" />
                </div>
              ))}
            </div>
          ) : wishlist.length === 0 ? (
            <div className="empty-message">
              <div className="empty-message-icon">
                <img src="/assets/images/empty_list.png" alt="img" />
              </div>
              <p className="empty-message-text">Your wishlist is empty</p>
              <Link href="/products" className="btn btn-outline--base btn--sm mt-3">
                View Products
              </Link>
            </div>
          ) : (
            <div className="row gy-4 wishListCard">
              {wishlist.map((row) => (
                <div className="col-xsm-6 col-sm-6 col-lg-4 col-xxl-3 wishlistItem" key={row.id}>
                  <ProductCard product={row.product} showcase="collection" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
