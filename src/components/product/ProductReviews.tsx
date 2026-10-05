'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTranslate } from '@/components/providers/LanguageProvider';
import { Rating } from '@/components/product/Rating';
import { api } from '@/lib/api';
import { formatDate, imageUrl } from '@/lib/format';
import { useMounted } from '@/lib/useMounted';
import type { Pagination, ProductDetail, ProductReview } from '@/types';

/**
 * Review list with the rating breakdown, mirroring the theme's
 * `components/review/index.blade.php`. Reviews are submitted from the
 * customer dashboard, exactly as in the source system (only verified
 * purchasers may review).
 */
export function ProductReviews({ product }: { product: ProductDetail }) {
  const t = useTranslate();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const mounted = useMounted();

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      setLoading(true);

      try {
        const data = await api<{ reviews: ProductReview[]; pagination: Pagination; is_last_page: boolean }>(
          `/products/${product.id}/reviews?page=${nextPage}`,
        );

        if (!mounted()) return;

        setReviews((current) => (append ? [...current, ...data.reviews] : data.reviews));
        setPagination(data.pagination);
      } catch {
        if (!append && mounted()) setReviews([]);
      } finally {
        if (mounted()) setLoading(false);
      }
    },
    [product.id, mounted],
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  const totalRatings = product.rating_breakdown.reduce((sum, row) => sum + row.count, 0) || 1;

  return (
    <div className="product-details-card">
      <div className="product-details-card__header">
        <h5 className="product-details-card__title">{t('Reviews')}</h5>
      </div>
      <div className="product-details-card__body">
        <div className="row gy-4">
          <div className="col-lg-4">
            <div className="reviews-box">
              <h6>Ratings</h6>
              <div className="ratings-number">
                <span>{product.avg_rating.toFixed(1)}</span>
                <Rating average={product.avg_rating} showCount={false} />
              </div>
              <p>
                from {product.total_reviews} review{product.total_reviews === 1 ? '' : 's'}
              </p>

              <ul className="rating-progress-list mt-3">
                {product.rating_breakdown.map((row) => (
                  <li className="rating-progress-list__item d-flex align-items-center gap-2 mb-2" key={row.rating}>
                    <span style={{ minWidth: 46 }}>{row.rating} star</span>
                    <div className="progress flex-grow-1" style={{ height: 8 }}>
                      <div
                        className="progress-bar"
                        style={{
                          width: `${Math.round((row.count / totalRatings) * 100)}%`,
                          background: 'hsl(var(--base))',
                        }}
                      />
                    </div>
                    <span style={{ minWidth: 28, textAlign: 'right' }}>{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="col-lg-8">
            {reviews.length === 0 && !loading ? (
              <p className="mb-0">No reviews yet. Be the first to review this product after your order arrives.</p>
            ) : (
              <ul className="comment-list">
                {reviews.map((review) => (
                  <li className="comment-list__item" key={review.id}>
                    <div className="comment-card">
                      <div className="comment-card__thumb">
                        <img src={imageUrl(review.user.image ?? '/assets/images/avatar.png')} alt={review.user.name} />
                      </div>
                      <div className="comment-card__content">
                        <div className="comment-card__header">
                          <h6 className="comment-card__name">{review.user.name || review.user.username}</h6>
                          <span className="comment-card__date">{formatDate(review.created_at)}</span>
                        </div>
                        <Rating average={review.rating} showCount={false} />
                        <p className="comment-card__desc">{review.review}</p>

                        {review.images.length > 0 && (
                          <div className="d-flex gap-2 mt-2 flex-wrap">
                            {review.images.map((image) => (
                              <a className="lightbox-image" href={image} data-fancybox="review" key={image}>
                                <img src={image} alt="review" width={72} height={72} style={{ borderRadius: 6 }} />
                              </a>
                            ))}
                          </div>
                        )}

                        {review.reply && (
                          <div className="comment-card__reply mt-3 p-3" style={{ background: 'rgba(0,0,0,.03)', borderRadius: 8 }}>
                            <strong>VIPURI replied</strong>
                            <p className="mb-0 mt-1">{review.reply.comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {pagination && pagination.current_page < pagination.last_page && (
              <button
                className="btn btn-outline--base btn--sm mt-4"
                type="button"
                disabled={loading}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  void load(next, true);
                }}
              >
                {loading ? 'Loading…' : 'Load more reviews'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
