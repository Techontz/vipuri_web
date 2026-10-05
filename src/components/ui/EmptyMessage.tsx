import Link from 'next/link';

/** Empty state, matching the theme's `components/empty-message.blade.php`. */
export function EmptyMessage({
  message = 'No data found',
  image = '/assets/images/empty-box.png',
  action,
}: {
  message?: string;
  image?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="col-12">
      <div className="empty-message">
        <div className="empty-message-icon">
          <img src={image} alt="img" />
        </div>
        <p className="empty-message-text">{message}</p>
        {action && (
          <Link href={action.href} className="btn btn-outline--base btn--sm mt-3">
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
