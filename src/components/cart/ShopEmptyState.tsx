import Link from 'next/link';

/**
 * One empty state for the shopping flow (cart, wishlist, checkout): a bordered
 * card with an icon, a heading-font title, a muted line and a solid CTA.
 * Builds on the `.account-empty` classes from vipuri.css.
 */
export function ShopEmptyState({
  icon,
  title,
  description = 'Browse tyres, brakes, filters and more from VIPURI branches.',
  actionLabel = 'Browse products',
  actionHref = '/products',
}: {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="shop-empty account-empty">
      <span className="account-empty__icon" aria-hidden="true">
        <i className={icon} />
      </span>
      <h5 className="account-empty__title">{title}</h5>
      <p className="account-empty__desc">{description}</p>
      <Link href={actionHref} className="btn btn--base">
        {actionLabel}
      </Link>
    </div>
  );
}
