'use client';

import { showAmount } from '@/lib/format';
import type { ProductCard, ProductDetail, ProductVariation } from '@/types';

/**
 * Price display, ported from the theme's `components/product/price.blade.php`.
 *
 * - grouped   → "Starting at <lowest child price>"
 * - variable  → a range, or the selected variation's price
 * - simple    → current price, with the struck-through regular price when discounted
 */
export function ProductPrice({
  product,
  variations,
  selectedVariation,
}: {
  product: ProductCard | ProductDetail;
  variations?: ProductVariation[];
  selectedVariation?: ProductVariation | null;
}) {
  const type = product.product_type;

  if (type === 'grouped') {
    const children = 'grouped_products' in product ? product.grouped_products : [];
    const prices = children.map((child) => child.price).filter((price) => price > 0);
    const startingAt = prices.length > 0 ? Math.min(...prices) : product.price;

    return (
      <span>
        <span className="price-label">Starting at</span> {showAmount(startingAt)}
      </span>
    );
  }

  if (type === 'variable') {
    if (selectedVariation) {
      const discounted = selectedVariation.price < selectedVariation.regular_price;

      return (
        <span data-price={selectedVariation.price}>
          <span>{showAmount(selectedVariation.price)}</span>
          {discounted && <del>{showAmount(selectedVariation.regular_price)}</del>}
        </span>
      );
    }

    const list = variations ?? ('variations' in product ? product.variations : []) ?? [];

    if (list.length === 0) {
      return (
        <span data-price={product.price}>
          <span>{showAmount(product.price)}</span>
        </span>
      );
    }

    const regulars = list.map((v) => v.regular_price);
    const finals = list.map((v) => v.price);
    const minRegular = Math.min(...regulars);
    const maxRegular = Math.max(...regulars);
    const minFinal = Math.min(...finals);
    const lowest = Math.min(minFinal, minRegular);

    return (
      <span data-price={minRegular}>
        {lowest !== maxRegular ? `${showAmount(lowest)} - ${showAmount(maxRegular)}` : showAmount(lowest)}
      </span>
    );
  }

  const discounted = product.price < product.regular_price;

  return (
    <span data-price={product.price}>
      <span>{showAmount(product.price)}</span>
      {discounted && <del>{showAmount(product.regular_price)}</del>}
    </span>
  );
}
