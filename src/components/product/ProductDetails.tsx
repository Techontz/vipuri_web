'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { AiChatPanel, AiReviewSummary } from '@/components/product/ProductAi';
import { ProductCard, WishlistButton } from '@/components/product/ProductCard';
import { ProductPrice } from '@/components/product/ProductPrice';
import { ProductReviews } from '@/components/product/ProductReviews';
import { Rating } from '@/components/product/Rating';
import { useTranslate } from '@/components/providers/LanguageProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useSettings } from '@/components/providers/AppProviders';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { imageUrl, showAmount } from '@/lib/format';
import { toastError } from '@/lib/toast';
import type { ProductCard as ProductCardType, ProductDetail, ProductVariation } from '@/types';

/**
 * Product detail page. Reproduces `templates/basic/product_details.blade.php`:
 * gallery + main panel, then the Description / Reviews / Specification /
 * AI Chat tab strip, then up-sells and cross-sells.
 */
export function ProductDetails({
  product,
  relatedProducts,
}: {
  product: ProductDetail;
  relatedProducts: ProductCardType[];
}) {
  const t = useTranslate();
  const settings = useSettings();
  const { addToCart } = useCart();

  // Pre-select the attribute values the merchandiser marked as default.
  const [selectedValues, setSelectedValues] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    product.attributes.forEach((attribute) => {
      const preselected = attribute.values.find((value) => value.is_pre_selected);
      if (preselected) initial[attribute.id] = preselected.id;
    });
    return initial;
  });

  const [quantity, setQuantity] = useState(product.min_cart_quantity || 1);
  const [activeImage, setActiveImage] = useState(0);
  const [busy, setBusy] = useState(false);

  const selectedVariation: ProductVariation | null = useMemo(() => {
    if (product.product_type !== 'variable') return null;

    const chosen = Object.values(selectedValues).sort((a, b) => a - b);
    if (chosen.length === 0) return null;

    return (
      product.variations.find((variation) => {
        const values = [...variation.attribute_values].sort((a, b) => a - b);
        return values.length === chosen.length && values.every((value, index) => value === chosen[index]);
      }) ?? null
    );
  }, [product, selectedValues]);

  const gallery = useMemo(() => {
    if (selectedVariation && selectedVariation.images.length > 0) {
      return selectedVariation.images.map((image) => image.url ?? image.thumb);
    }
    return product.gallery.map((image) => image.url);
  }, [product.gallery, selectedVariation]);

  useEffect(() => {
    setActiveImage(0);
  }, [selectedVariation]);

  const discountLabel =
    product.discount_percent > 0 ? `-${product.discount_percent}%` : product.is_on_sale ? 'Sale' : null;

  const inventory = selectedVariation
    ? {
        track: selectedVariation.track_inventory,
        stock: selectedVariation.stock_quantity,
        show: selectedVariation.display_stock_quantity,
        available: selectedVariation.display_available,
        buyable: selectedVariation.is_buyable,
      }
    : {
        track: product.inventory.track_inventory,
        stock: product.inventory.stock_quantity,
        show: product.inventory.display_stock_quantity,
        available: product.inventory.display_available,
        buyable: product.inventory.is_buyable,
      };

  const maxQuantity = selectedVariation?.max_cart_quantity || product.max_cart_quantity || undefined;
  const minQuantity = selectedVariation?.min_cart_quantity || product.min_cart_quantity || 1;

  const submitToCart = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (product.product_type === 'variable' && !selectedVariation) {
      toastError('Please choose the product options');
      return;
    }

    setBusy(true);
    await addToCart(product.slug, {
      quantity,
      attributeValues: Object.values(selectedValues),
    });
    setBusy(false);
  };

  return (
    <>
      <Breadcrumb title={product.name} />

      <section className="product-details my-120">
        <div className="container">
          <div className="product-details__content">
            <div className="row gy-4">
              {/* ------------------------- Gallery ------------------------ */}
              <div className="col-lg-6">
                <div className="product-details__gallary">
                  {discountLabel && <span className="product-details__discount">{discountLabel}</span>}

                  <div className="product-details-thumb-slider--static">
                    <div className="product-details-thumb-slider__slide">
                      <img src={imageUrl(gallery[activeImage])} alt="image" />
                    </div>
                  </div>

                  {gallery.length > 1 && (
                    <div className="product-details-prev-slider--static">
                      {gallery.map((image, index) => (
                        <button
                          type="button"
                          className={`product-details-prev-slider__slide ${index === activeImage ? 'is-active' : ''}`}
                          key={`${image}-${index}`}
                          onClick={() => setActiveImage(index)}
                          aria-label={`View image ${index + 1}`}
                        >
                          <img src={imageUrl(image)} alt="image" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* -------------------------- Main -------------------------- */}
              <div className="col-lg-6">
                <div className="product-details__main">
                  <form className="productCartForm" onSubmit={submitToCart}>
                    {product.categories.length > 0 && (
                      <span className="product-details__cat">{product.categories[0].name}</span>
                    )}

                    <h3 className="product-details__title">{product.name}</h3>

                    <p className="product-details__desc">{product.short_description}</p>

                    <div className="product-details__wrapper">
                      <h3 className="product-details__amount">
                        <ProductPrice
                          product={product}
                          variations={product.variations}
                          selectedVariation={selectedVariation}
                        />
                      </h3>
                      <Rating average={product.avg_rating} total={product.total_reviews} />
                    </div>

                    <ul className="product-details-info">
                      {product.brand?.name && (
                        <li className="product-details-info__item">
                          <span className="label">Brand</span>
                          <span className="value">{product.brand.name}</span>
                        </li>
                      )}

                      {product.categories.length > 0 && (
                        <li className="product-details-info__item">
                          <span className="label">{t('Categories')}</span>
                          <span className="value">
                            {product.categories.map((cat, index) => (
                              <span key={cat.id}>
                                <Link href={`/products?category=${cat.slug}`}>{cat.name}</Link>
                                {index < product.categories.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </span>
                        </li>
                      )}

                      {(selectedVariation?.sku || product.sku) && (
                        <li className="product-details-info__item">
                          <span className="label">SKU</span>
                          <span className="value">{selectedVariation?.sku || product.sku}</span>
                        </li>
                      )}

                      {product.tax?.show && product.tax.status === 'taxable' && (
                        <li className="product-details-info__item">
                          <span className="label">{product.tax.name}</span>
                          <span className="value">{product.tax.rate}%</span>
                        </li>
                      )}

                      {product.vehicle.model && (
                        <li className="product-details-info__item">
                          <span className="label">Fits</span>
                          <span className="value">
                            {[product.vehicle.year, product.vehicle.model, product.vehicle.engine, product.vehicle.engine_type]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </li>
                      )}

                      {inventory.available && (
                        <li className="product-details-info__item">
                          <span className="label">Availability</span>
                          <span className="value">
                            {inventory.buyable ? (
                              <>
                                In Stock
                                {inventory.show && inventory.track ? ` (${inventory.stock} ${product.inventory.unit ?? ''})` : ''}
                              </>
                            ) : (
                              'Out of Stock'
                            )}
                          </span>
                        </li>
                      )}
                    </ul>

                    {/* ------------------------ Attributes ------------------ */}
                    {product.attributes.length > 0 && (
                      <div className="product-details-attr__wrapper">
                        {product.attributes
                          .filter((attribute) => attribute.is_visible)
                          .map((attribute) => (
                            <div className="product-details-attr" key={attribute.id}>
                              <div className="product-details-attr__header">
                                <span className="product-details-attr__label">{attribute.name}</span>
                              </div>
                              <div
                                className={`product-details-attr__body ${attribute.control_type ?? ''}`}
                                data-attribute-id={attribute.id}
                              >
                                {attribute.control_type === 'dropdown' ? (
                                  <select
                                    className="form-select form--select"
                                    value={selectedValues[attribute.id] ?? ''}
                                    onChange={(event) =>
                                      setSelectedValues((current) => ({
                                        ...current,
                                        [attribute.id]: Number(event.target.value),
                                      }))
                                    }
                                  >
                                    <option value="">Choose {attribute.name}</option>
                                    {attribute.values.map((value) => (
                                      <option value={value.id} key={value.id}>
                                        {value.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <ul className="product-details-attr-grid">
                                    {attribute.values.map((value) => {
                                      const selected = selectedValues[attribute.id] === value.id;

                                      return (
                                        <li className="product-details-attr-grid__item" key={value.id}>
                                          <label
                                            className={`product-details-attr-item ${selected ? 'selected' : ''}`}
                                            htmlFor={`attr-${value.id}`}
                                          >
                                            <input
                                              className="visually-hidden attribute-selector"
                                              type="radio"
                                              name={`attribute_values[${attribute.id}]`}
                                              id={`attr-${value.id}`}
                                              value={value.id}
                                              checked={selected}
                                              onChange={() =>
                                                setSelectedValues((current) => ({
                                                  ...current,
                                                  [attribute.id]: value.id,
                                                }))
                                              }
                                            />
                                            <span
                                              className="product-details-attr-item__input"
                                              style={
                                                attribute.control_type === 'color' && value.color_code
                                                  ? { backgroundColor: value.color_code }
                                                  : undefined
                                              }
                                            />
                                            <span className="product-details-attr-item__name">{value.name}</span>
                                          </label>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* ---------------------- Grouped children -------------- */}
                    {product.product_type === 'grouped' && product.grouped_products.length > 0 && (
                      <div className="product-details-group">
                        <ul className="product-details-group-list">
                          {product.grouped_products.map((child) => (
                            <li className="product-details-group-list__item" key={child.id}>
                              <Link href={`/product/${child.slug}`} className="d-flex align-items-center gap-3">
                                <img src={imageUrl(child.image)} alt={child.name} width={56} height={56} />
                                <span className="flex-grow-1">{child.name}</span>
                                <strong>{showAmount(child.price)}</strong>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ------------------------- Actions -------------------- */}
                    {product.product_type === 'external' ? (
                      <ul className="product-details-meta">
                        <li className="product-details-meta__item">
                          <a
                            className="btn btn--base"
                            href={product.product_url ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {product.button_text || 'Buy Now'}
                          </a>
                        </li>
                        <li className="product-details-meta__item">
                          <WishlistButton productId={product.id} />
                        </li>
                      </ul>
                    ) : (
                      product.product_type !== 'grouped' && (
                        <ul className="product-details-meta">
                          <li className="product-details-meta__item">
                            <div className="product-details__qty">
                              <div className="qty-container qtyInput">
                                <button
                                  className="qty-btn-minus qtyDecrease detailsQtyBtnMinus"
                                  type="button"
                                  onClick={() => setQuantity((value) => Math.max(minQuantity, value - 1))}
                                >
                                  <i className="fa fa-minus" />
                                </button>
                                <input
                                  type="number"
                                  name="quantity"
                                  value={quantity}
                                  min={minQuantity}
                                  max={maxQuantity}
                                  className="input-qty qtyValue"
                                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                                />
                                <button
                                  className="qty-btn-plus qtyIncrease"
                                  type="button"
                                  onClick={() =>
                                    setQuantity((value) => (maxQuantity ? Math.min(maxQuantity, value + 1) : value + 1))
                                  }
                                >
                                  <i className="fa fa-plus" />
                                </button>
                              </div>
                            </div>
                          </li>
                          <li className="product-details-meta__item">
                            <WishlistButton productId={product.id} />
                          </li>
                          <li className="product-details-meta__item">
                            <button
                              type="button"
                              className="wishlist-btn openShareModal"
                              data-modal="#productShareModal"
                              data-bs-toggle="modal"
                              data-bs-target="#productShareModal"
                              aria-label="Share"
                            >
                              <i className="las la-share" />
                            </button>
                          </li>
                          <li className="product-details-meta__item">
                            <button type="submit" className="btn btn--base qtyAddCartBtn" disabled={busy || !inventory.buyable}>
                              {inventory.buyable ? (busy ? 'Adding…' : 'Add To Cart') : 'Out of Stock'}
                            </button>
                          </li>
                        </ul>
                      )
                    )}
                  </form>

                  {/* ------------------ Branch availability ---------------- */}
                  {product.branch_availability && product.branch_availability.length > 0 && (
                    <div>
                      <h6 className="mt-4 mb-0">Availability at VIPURI branches</h6>
                      <ul className="branch-stock-list">
                        {product.branch_availability
                          .filter((row) => row.variation_id === (selectedVariation?.id ?? 0))
                          .map((row) => (
                            <li className="branch-stock-list__item" key={`${row.branch_id}-${row.variation_id}`}>
                              <span>
                                {row.branch_name}
                                {row.city ? ` — ${row.city}` : ''}
                              </span>
                              <span className={`branch-stock-list__status ${row.in_stock ? 'in' : 'out'}`}>
                                {row.in_stock ? `${row.quantity} in stock` : 'Out of stock'}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------- Tabs --------------------------- */}
          <nav className="nav-horizontal mb-4" role="tablist">
            <ul className="nav-horizontal-menu">
              <li className="nav-horizontal-menu__item">
                <button
                  className="product-details-tab__btn active"
                  id="pills-description-tab"
                  data-bs-toggle="pill"
                  data-bs-target="#pills-description"
                  type="button"
                  role="tab"
                  aria-selected="true"
                >
                  <i className="las la-book" /> {t('Description')}
                </button>
              </li>
              <li className="nav-horizontal-menu__item">
                <button
                  className="product-details-tab__btn"
                  id="pills-review-tab"
                  data-bs-toggle="pill"
                  data-bs-target="#pills-review"
                  type="button"
                  role="tab"
                  aria-selected="false"
                  tabIndex={-1}
                >
                  <i className="las la-star" /> Reviews ({product.total_reviews})
                </button>
              </li>
              <li className="nav-horizontal-menu__item">
                <button
                  className="product-details-tab__btn"
                  id="pills-spec-tab"
                  data-bs-toggle="pill"
                  data-bs-target="#pills-spec"
                  type="button"
                  role="tab"
                  aria-selected="false"
                  tabIndex={-1}
                >
                  <i className="las la-sliders-h" /> {t('Specification')}
                </button>
              </li>
              {settings?.site.ai_product_chat && (
                <li className="nav-horizontal-menu__item">
                  <button
                    className="product-details-tab__btn"
                    id="pills-aichat-tab"
                    data-bs-toggle="pill"
                    data-bs-target="#pills-aichat"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    tabIndex={-1}
                  >
                    <i className="las la-robot" /> AI Chat
                  </button>
                </li>
              )}
            </ul>
          </nav>

          <div className="tab-content">
            <div
              className="tab-pane fade show active"
              id="pills-description"
              role="tabpanel"
              aria-labelledby="#pills-description-tab"
            >
              <div className="product-details-card">
                <div className="product-details-card__header">
                  <h5 className="product-details-card__title">{t('Description')}</h5>
                </div>
                <div
                  className="product-details-card__body"
                  dangerouslySetInnerHTML={{ __html: product.description ?? '' }}
                />
              </div>
            </div>

            <div className="tab-pane fade" id="pills-review" role="tabpanel" aria-labelledby="#pills-review-tab">
              <ProductReviews product={product} />
            </div>

            <div className="tab-pane fade" id="pills-spec" role="tabpanel" aria-labelledby="#pills-spec-tab">
              <div className="product-details-card">
                <div className="product-details-card__header">
                  <h5 className="product-details-card__title">{t('Specification')}</h5>
                </div>
                <div className="product-details-card__body">
                  {product.specifications.length > 0 ? (
                    <ul className="product-details-spec">
                      {product.specifications.map((spec) => (
                        <li className="product-details-spec__item" key={spec.key}>
                          <span className="label">{spec.key}</span>
                          <span className="value">{spec.value}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center">
                      <h4>No specification found</h4>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {settings?.site.ai_product_chat && (
              <div className="tab-pane fade" id="pills-aichat" role="tabpanel" aria-labelledby="#pills-aichat-tab">
                <AiChatPanel productId={product.id} productName={product.name} />
              </div>
            )}
          </div>

          {settings?.site.ai_review_summary && product.total_reviews > 0 && (
            <AiReviewSummary productId={product.id} />
          )}
        </div>
      </section>

      {/* --------------------------- Up-sells --------------------------- */}
      {product.up_sells.length > 0 && (
        <section className="up-sell-product my-120">
          <div className="container">
            <div className="section-heading style-left">
              <div className="section-heading__inner">
                <h2 className="section-heading__title">You may also like</h2>
              </div>
            </div>
            <div className="row gy-4">
              {product.up_sells.map((item) => (
                <div className="col-xsm-6 col-sm-6 col-lg-4 col-xxl-3" key={item.id}>
                  <ProductCard product={item} showcase="popular" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------- Cross-sells -------------------------- */}
      {product.cross_sells.length > 0 && (
        <section className="cross-sell-product my-120">
          <div className="container">
            <div className="section-heading style-left">
              <div className="section-heading__inner">
                <h2 className="section-heading__title">Frequently bought together</h2>
              </div>
            </div>
            <div className="row gy-4">
              {product.cross_sells.map((item) => (
                <div className="col-xsm-6 col-sm-6 col-lg-4 col-xxl-3" key={item.id}>
                  <ProductCard product={item} showcase="popular" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --------------------------- Related ---------------------------- */}
      {product.up_sells.length === 0 && relatedProducts.length > 0 && (
        <section className="related-product my-120">
          <div className="container">
            <div className="section-heading style-left">
              <div className="section-heading__inner">
                <h2 className="section-heading__title">{t('Related Products')}</h2>
              </div>
            </div>
            <div className="row gy-4">
              {relatedProducts.slice(0, 8).map((item) => (
                <div className="col-xsm-6 col-sm-6 col-lg-4 col-xxl-3" key={item.id}>
                  <ProductCard product={item} showcase="popular" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --------------------------- Share modal ------------------------ */}
      <div className="modal custom--modal fade" id="productShareModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title mb-0">Share With</h5>
              <button
                type="button"
                className="btn btn--sm btn-soft--dark btn--close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </div>
            <div className="modal-body">
              <ShareLinks name={product.name} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ShareLinks({ name }: { name: string }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const encoded = encodeURIComponent(url);
  const title = encodeURIComponent(name);

  return (
    <div className="jss-share">
      <ul className="jss-share-list">
        <li className="jss-share__item">
          <a
            className="jss-share-list__link"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fab fa-facebook-f" />
          </a>
        </li>
        <li className="jss-share__item">
          <a
            className="jss-share-list__link"
            href={`https://twitter.com/intent/tweet?url=${encoded}&text=${title}`}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fab fa-x-twitter" />
          </a>
        </li>
        <li className="jss-share__item">
          <a
            className="jss-share-list__link"
            href={`https://wa.me/?text=${title}%20${encoded}`}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fab fa-whatsapp" />
          </a>
        </li>
        <li className="jss-share__item">
          <a
            className="jss-share-list__link"
            href={`https://www.linkedin.com/shareArticle?mini=true&url=${encoded}&title=${title}`}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fab fa-linkedin-in" />
          </a>
        </li>
      </ul>
      <div className="jss-share-divider">
        <span>Or share with link</span>
      </div>
      <div className="input-group input--group input--group-copy">
        <input className="form-control form--control copy-input" type="text" value={url} readOnly />
        <button
          className="btn btn--icon btn--base copy-btn"
          type="button"
          onClick={() => navigator.clipboard?.writeText(url)}
          aria-label="Copy link"
        >
          <i className="las la-copy" />
        </button>
      </div>
    </div>
  );
}
