'use client';

import Link from 'next/link';
import { useState } from 'react';

import { WishlistButton } from '@/components/product/ProductCard';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { useTranslate } from '@/components/providers/LanguageProvider';
import { useCart } from '@/components/providers/CartProvider';
import { imageUrl, showAmount } from '@/lib/format';

/**
 * Shopping cart page. Reproduces `templates/basic/cart.blade.php` and the
 * `components/cart/basic/*` partials: item list on the left, summary with the
 * promo-code form on the right.
 */
export function CartPageContent() {
  const t = useTranslate();
  const { items, summary, loading, updateQuantity, removeItem, applyCoupon, removeCoupon } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [applying, setApplying] = useState(false);

  return (
    <section className="dashboard my-120 cart">
      <div className="container large-container">
        <div className="cart-header">
          <h5 className="cart-header__title">
            Shopping Cart <i className="las la-shopping-cart" />
          </h5>
          <p className="desc mb-0">
            <span className="cartItemsCount">{summary.cart_count}</span> Items in cart
          </p>
        </div>

        <div className="cart-wrapper">
          <div className="cart-wrapper__left">
            <div className="cart-body">
              <ul className="cart-list cartItemsList">
                {loading && items.length === 0 ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <li className="cart-list-item" key={index}>
                      <div className="vp-skeleton" style={{ height: 120, width: '100%' }} />
                    </li>
                  ))
                ) : items.length === 0 ? (
                  <div className="empty-message">
                    <div className="empty-message-icon">
                      <img src="/assets/images/empty_cart.png" alt="img" />
                    </div>
                    <p className="empty-message-text">No items found</p>
                    <Link href="/products" className="btn btn-outline--base btn--sm mt-3">
                      View Products
                    </Link>
                  </div>
                ) : (
                  items.map((item) => (
                    <li className="cart-list-item singleCartItem" data-id={item.id} key={item.id}>
                      <div className="cart-list-item__thumb">
                        <Link href={`/product/${item.product_slug}`}>
                          <img src={imageUrl(item.product_image)} alt={item.product_name ?? 'product'} />
                        </Link>
                      </div>

                      <div className="cart-list-item__content">
                        <div className="cart-list-item__content-top">
                          <h6 className="cart-list-item__title">
                            <Link href={`/product/${item.product_slug}`}>{item.product_name}</Link>
                          </h6>
                          <span className="cart-list-item__price">{showAmount(item.price)}</span>
                        </div>

                        <div className="cart-list-item__content-middle">
                          <div className="cart-list-item__variation">
                            {Object.entries(item.variations ?? {}).map(([label, value]) => (
                              <span className="cart-list-item__variation-item" key={label}>
                                {label}: <strong>{value}</strong>
                              </span>
                            ))}
                          </div>
                          <div className="cart-list-item__content-info">
                            <ul className="list">
                              {item.tax_rate > 0 && (
                                <li>
                                  <span>{item.tax_name ?? 'Tax'}</span>
                                  <span>{showAmount(item.tax_amount)}</span>
                                </li>
                              )}
                              <li>
                                <span>{t('Subtotal')}</span>
                                <span>{showAmount(item.subtotal)}</span>
                              </li>
                            </ul>
                          </div>
                        </div>

                        <div className="cart-list-item__content-bottom">
                          <ul className="qnty-cart-list">
                            <li className="qnty-cart-list__item">
                              <QuantityInput
                                value={item.quantity}
                                min={item.min_cart_quantity || 1}
                                max={item.max_cart_quantity || undefined}
                                onChange={(quantity) => void updateQuantity(item.id, quantity)}
                              />
                            </li>
                          </ul>
                          <div className="cart-list-item__action">
                            <button
                              type="button"
                              className="product-item__delete-btn action-button"
                              onClick={() => void removeItem(item.id)}
                              aria-label="Remove item"
                            >
                              <i className="las la-trash-alt" />
                            </button>
                            <WishlistButton productId={item.product_id} />
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="cart-wrapper__right">
            <div className="checkout-information">
              <h5 className="title mb-3">Summary</h5>

              <div className="cartSummarySection">
                <div className="promo-code-form d-flex align-items-stretch gap-2 mb-4">
                  <input
                    type="text"
                    className="form-control form--control animated-placeholder applyCouponInput"
                    placeholder="Apply promo code..."
                    autoComplete="off"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    disabled={Boolean(summary.coupon)}
                  />
                  <button
                    type="button"
                    className="btn btn--base input-group-text applyCouponButton"
                    disabled={applying || Boolean(summary.coupon) || couponCode.trim().length === 0}
                    onClick={async () => {
                      setApplying(true);
                      const ok = await applyCoupon(couponCode.trim());
                      if (ok) setCouponCode('');
                      setApplying(false);
                    }}
                  >
                    {applying ? 'Applying…' : 'Apply'}
                  </button>
                </div>

                <ul className="checkout-information__list">
                  <li>
                    <span>{t('Subtotal')}</span> <span>{showAmount(summary.subtotal)}</span>
                  </li>
                  <li>
                    <span>Total Items</span> <span>{summary.total_items}</span>
                  </li>
                  {summary.total_tax > 0 && (
                    <li>
                      <span>{t('Tax')}</span> <span>{showAmount(summary.total_tax)}</span>
                    </li>
                  )}
                  {summary.coupon && (
                    <li>
                      <span>
                        Coupon Applied <span className="fw-bold">{summary.coupon.code}</span>
                      </span>
                      <span className="text--base">
                        - {showAmount(summary.discount)}{' '}
                        <button
                          type="button"
                          className="text--danger removeCouponBtn"
                          title="Remove Coupon"
                          onClick={() => void removeCoupon()}
                          style={{ background: 'none', border: 0 }}
                        >
                          <i className="fas fa-times" />
                        </button>
                      </span>
                    </li>
                  )}
                </ul>

                <div className="checkout-information__total">
                  <span>{t('Total')}</span> <span>{showAmount(summary.subtotal - summary.discount)}</span>
                </div>

                {items.length > 0 ? (
                  <Link href="/checkout" className="btn--base btn w-100">
                    {t('Checkout')}
                  </Link>
                ) : (
                  <Link href="/products" className="btn--base btn w-100">
                    Start Shopping
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
