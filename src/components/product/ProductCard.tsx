'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCart } from '@/components/providers/CartProvider';
import { ProductPrice } from '@/components/product/ProductPrice';
import { Rating } from '@/components/product/Rating';
import { imageUrl } from '@/lib/format';
import type { ProductCard as ProductCardType } from '@/types';

type Showcase = 'general' | 'popular' | 'deal' | 'collection' | 'special_offer_product';

/** Heart toggle, ported from `components/product/wishlist-button.blade.php`. */
export function WishlistButton({
  productId,
  onlyRemove = false,
  onRemoved,
}: {
  productId: number;
  onlyRemove?: boolean;
  onRemoved?: () => void;
}) {
  const { toggleWishlist, isWishlisted } = useCart();
  const active = !onlyRemove && isWishlisted(productId);

  const classes = [
    'wishlist-btn',
    'addToWishList',
    active ? 'active' : '',
    onlyRemove ? 'text--danger onlyRemove product-item__delete-btn action-button' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      type="button"
      data-id={productId}
      aria-label={onlyRemove ? 'Remove from wishlist' : 'Add to wishlist'}
      onClick={() => {
        void toggleWishlist(productId).then(() => onRemoved?.());
      }}
    >
      {onlyRemove ? (
        <i className="las la-trash-alt" />
      ) : (
        <>
          <i className="add lar la-heart" />
          <i className="remove las la-heart" />
        </>
      )}
    </button>
  );
}

/** Add-to-cart button, ported from `components/product/card/cart-btn.blade.php`. */
export function AddToCartButton({
  product,
  className = 'w-100 btn btn--sm btn--base',
}: {
  product: ProductCardType;
  className?: string;
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [busy, setBusy] = useState(false);

  if (product.product_type === 'grouped' || product.product_type === 'variable') {
    return (
      <Link className={className} href={`/product/${product.slug}`}>
        View Details
      </Link>
    );
  }

  if (product.product_type === 'external') {
    return (
      <a className={className} href={product.product_url ?? '#'} target="_blank" rel="noreferrer">
        {product.button_text || 'Buy Now'}
      </a>
    );
  }

  const disabled = busy || !product.is_buyable;

  return (
    <button
      type="button"
      className={`${className} addProductToCart`}
      data-slug={product.slug}
      disabled={disabled}
      onClick={async () => {
        setBusy(true);
        const result = await addToCart(product.slug, { quantity: 1, single: true });
        setBusy(false);

        if (result.requiresOptions && result.productSlug) {
          router.push(`/product/${result.productSlug}`);
        }
      }}
    >
      {product.is_buyable ? (busy ? 'Adding…' : 'Add to Cart') : 'Out of Stock'}
    </button>
  );
}

/**
 * Product card. Each `showcase` reproduces the matching branch of the theme's
 * `components/product/card/index.blade.php`, class-for-class.
 */
export function ProductCard({
  product,
  showcase = 'general',
}: {
  product: ProductCardType;
  showcase?: Showcase;
}) {
  const category = product.categories?.[0]?.name ?? '';
  const href = `/product/${product.slug}`;
  const image = imageUrl(product.image_full ?? product.image);

  if (showcase === 'popular') {
    return (
      <div className="product-card2">
        <div className="product-card2__header">
          <div className="product-card2__thumb">
            <img src={image} alt="Product Image" />
          </div>
        </div>
        <div className="product-card2__body">
          <span className="product-card2__cat">{category}</span>
          <Rating average={product.avg_rating} countLabel={product.avg_rating.toFixed(2)} />
          <h5 className="product-card2__title">
            <Link href={href}>{product.name}</Link>
          </h5>
          <h6 className="product-card2__price">
            <ProductPrice product={product} />
          </h6>
        </div>
        <div className="product-card2__footer">
          <AddToCartButton product={product} />
        </div>
      </div>
    );
  }

  if (showcase === 'special_offer_product') {
    return (
      <div className="col-lg-4">
        <div className="product-card4">
          <div className="product-card4__header">
            <div className="product-card4__thumb">
              <img src={image} alt="Product Image" />
            </div>
          </div>
          <div className="product-card4__body">
            <span className="product-card4__cat">{category}</span>
            <Rating average={product.avg_rating} countLabel={product.avg_rating.toFixed(2)} />
            <h5 className="product-card4__title">
              <Link href={href} tabIndex={0}>
                {product.name}
              </Link>
            </h5>
            <h6 className="product-card4__price">
              <ProductPrice product={product} />
            </h6>
          </div>
          <div className="product-card4__footer">
            <AddToCartButton product={product} />
          </div>
        </div>
      </div>
    );
  }

  if (showcase === 'deal') {
    const discountLabel =
      product.discount_percent > 0 ? `${product.discount_percent}%` : product.is_on_sale ? 'Hot' : null;

    return (
      <div className="product-card3">
        <div className="product-card3__thumb">
          <img src={image} alt="productImage" />
        </div>
        <div className="product-card3__content">
          <div className="product-card3__content-body">
            <div className="product-card3__action">
              <Rating average={product.avg_rating} total={product.total_reviews} />
              {discountLabel && <span className="product-card3__discount">{discountLabel} Off</span>}
            </div>
            <h5 className="product-card3__title">
              <Link href={href}>{product.name}</Link>
            </h5>
            <h6 className="product-card3__price">
              <ProductPrice product={product} />
            </h6>
          </div>
          <div className="product-card3__content-footer">
            <AddToCartButton product={product} />
          </div>
        </div>
      </div>
    );
  }

  if (showcase === 'collection') {
    return (
      <div className="shop-block-one">
        <div className="inner-box">
          <div className="image-box">
            <ul className="option-list clearfix">
              <li>
                <WishlistButton productId={product.id} />
              </li>
            </ul>
            <figure className="image">
              <img src={image} alt="image" />
            </figure>
          </div>
          <div className="lower-content">
            <div className="lower-content__body">
              <span className="text">{category}</span>
              <Rating average={product.avg_rating} countLabel={product.avg_rating.toFixed(2)} />
              <h4>
                <Link href={href}>{product.name}</Link>
              </h4>
              <div className="price">
                <ProductPrice product={product} />
              </div>
            </div>
            <div className="lower-content__footer">
              <AddToCartButton product={product} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-block-one">
      <div className="inner-box">
        <WishlistButton productId={product.id} />
        <div className="image-box">
          <img src={image} alt={product.name} />
        </div>
        <div className="lower-content">
          <span className="text">{category}</span>
          <Rating average={product.avg_rating} countLabel={product.avg_rating.toFixed(2)} />
          <h4>
            <Link href={href}>{product.name}</Link>
          </h4>
          <div className="price">
            <ProductPrice product={product} />
          </div>
          <AddToCartButton product={product} />
        </div>
      </div>
    </div>
  );
}
