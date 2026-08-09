'use client';

import Link from 'next/link';

import { useTranslate } from '@/components/providers/LanguageProvider';
import { useCart } from '@/components/providers/CartProvider';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { imageUrl, showAmount } from '@/lib/format';

/**
 * Slide-in cart panel. Markup matches `partials/cart_sidebar.blade.php` and
 * `partials/sidebar_cart_item.blade.php`; the theme's own JS toggles the
 * `.active` class via the `.shop-cart` button in the header.
 */
export function CartSidebar() {
  const t = useTranslate();
  const { items, summary, updateQuantity, removeItem } = useCart();

  return (
    <div className="cart__sidebar">
      <div className="cart__header">
        <div>
          <h6 className="title mb-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M19.875 9.375H4.125C3.50368 9.375 3 9.87868 3 10.5C3 11.1213 3.50368 11.625 4.125 11.625H19.875C20.4963 11.625 21 11.1213 21 10.5C21 9.87868 20.4963 9.375 19.875 9.375Z"
                fill="currentColor"
              />
              <path
                d="M7.96101 8.62501L9.78876 6.60488C9.94851 6.42638 10.0288 6.20513 10.0288 5.98388C10.0288 5.73188 9.92413 5.48288 9.72426 5.30138C9.34626 4.96013 8.76201 4.98788 8.42076 5.36588L5.47363 8.62501H7.96138H7.96101Z"
                fill="currentColor"
              />
              <path
                d="M16.0386 8.62501H18.5263L15.5792 5.36588C15.2379 4.98788 14.6537 4.96013 14.2757 5.30138C14.0758 5.48288 13.9712 5.73188 13.9712 5.98388C13.9712 6.20513 14.0511 6.42676 14.2112 6.60488L16.0386 8.62501Z"
                fill="currentColor"
              />
              <path
                d="M4.57422 12.375L6.12784 18.1147C6.34834 18.9304 7.09272 19.5 7.93759 19.5H16.0627C16.9076 19.5 17.652 18.9304 17.8725 18.1147L19.4261 12.375H4.57422ZM9.07347 18.18C9.04872 18.1849 9.02397 18.1875 8.99959 18.1875C8.82447 18.1875 8.66772 18.0641 8.63247 17.886L7.88247 14.136C7.84197 13.9327 7.97359 13.7355 8.17647 13.6946C8.37972 13.6541 8.57734 13.7858 8.61784 13.9886L9.36784 17.7386C9.40834 17.9419 9.27672 18.1391 9.07384 18.18H9.07347ZM12.375 17.8125C12.375 18.0195 12.207 18.1875 12 18.1875C11.793 18.1875 11.625 18.0195 11.625 17.8125V14.0625C11.625 13.8555 11.793 13.6875 12 13.6875C12.207 13.6875 12.375 13.8555 12.375 14.0625V17.8125ZM15.3675 17.886C15.3318 18.0641 15.1751 18.1875 15.0003 18.1875C14.976 18.1875 14.9512 18.1852 14.9265 18.18C14.7232 18.1395 14.5916 17.9419 14.6325 17.7386L15.3825 13.9886C15.423 13.7858 15.6195 13.6538 15.8238 13.6946C16.0271 13.7351 16.1587 13.9327 16.1178 14.136L15.3675 17.886Z"
                fill="currentColor"
              />
            </svg>
            <span className="cartItemsCount">{summary.cart_count}</span> items
          </h6>
          <Link href="/cart" className="cart__page__link">
            Show in Cart Page
          </Link>
        </div>
        <div>
          <a className="sidebar-close-btn" href="javascript:void(0)">
            <i className="las la-times" />
          </a>
        </div>
      </div>

      <div className="cart__body sidebarCartItems">
        {items.length === 0 ? (
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
            <div className="cart__item singleCartItemSidebar" data-id={item.id} key={item.id}>
              <button
                type="button"
                className="cart__item__remove"
                onClick={() => void removeItem(item.id)}
                aria-label="Remove item"
              >
                <i className="las la-trash-alt" />
              </button>
              <div className="cart__item__img">
                <Link href={`/product/${item.product_slug}`}>
                  <img src={imageUrl(item.product_image)} alt="img" />
                </Link>
              </div>
              <div className="cart__item__content">
                <h6 className="cart__item__title">
                  <Link href={`/product/${item.product_slug}`} className="line-limitation-2">
                    {item.product_name}
                  </Link>
                </h6>

                <div className="cart__item__rating-price">
                  <div className="cart-item__rating">
                    <p className="product-short-info">
                      {item.tax_rate > 0 ? 'Including tax' : 'No tax applicable'}
                    </p>
                  </div>
                  <span className="cart__item__price sidebarCartItemSubtotal">{showAmount(item.subtotal)}</span>
                </div>

                <div className="cart-item-bottom">
                  <div className="cart-item-bottom__content">
                    {Object.keys(item.variations ?? {}).length > 0 ? (
                      <p className="product-short-info">
                        {Object.entries(item.variations)
                          .map(([label, value]) => `${label}: ${value}`)
                          .join(', ')}
                      </p>
                    ) : (
                      <p className="product-short-info">{item.tax_name ?? 'Genuine part'}</p>
                    )}
                  </div>
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
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="cart-bottom">
        <div className="subtotal-price">
          <div className="cart__discount__area discountBox">
            <span className="discount-title">{t('Discount')}</span>
            <span className="discount-price discountAmount">{showAmount(summary.discount)}</span>
          </div>
          <div className="cart__total__area">
            <span className="subtotal-title">{t('Total')}</span>
            <span className="subtotal-price payablePrice">
              {showAmount(summary.subtotal - summary.discount)}
            </span>
          </div>
        </div>
        <Link href="/checkout" className="checkout-btn btn btn--base w-100">
          Checkout <i className="las la-arrow-right" />
        </Link>
      </div>
    </div>
  );
}
