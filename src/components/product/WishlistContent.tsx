'use client';

import { ShopEmptyState } from '@/components/cart/ShopEmptyState';
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
            <div className="row gy-4 shop-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="col-xsm-6 col-sm-6 col-lg-4 col-xxl-3" key={index}>
                  <div className="vp-skeleton vp-skeleton--card" />
                </div>
              ))}
            </div>
          ) : wishlist.length === 0 ? (
            <ShopEmptyState
              icon="lar la-heart"
              title="Your wishlist is empty"
              description="Tap the heart on any part to save it here for later."
            />
          ) : (
            <div className="row gy-4 shop-grid wishListCard">
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
