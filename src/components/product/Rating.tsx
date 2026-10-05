'use client';

/**
 * Star rating list. Reproduces the source `displayRating()` helper exactly:
 * a half star appears once the fractional part passes 0.25, and rounds up
 * past 0.75.
 */
export function ratingStars(average: number): { full: number; half: boolean; empty: number } {
  const capped = Math.min(Math.max(average, 0), 5);
  const whole = Math.trunc(capped);
  const precision = Number((capped - whole).toFixed(2));

  let value = whole;
  let half = false;

  if (precision > 0.75) {
    value = whole + 1;
  } else if (precision > 0.25) {
    value = whole;
    half = true;
  }

  const full = Math.min(value, 5);
  const usedHalf = half && full < 5;

  return { full, half: usedHalf, empty: Math.max(0, 5 - full - (usedHalf ? 1 : 0)) };
}

export function Rating({
  average,
  total,
  showCount = true,
  countLabel,
}: {
  average: number;
  total?: number;
  showCount?: boolean;
  countLabel?: string;
}) {
  const { full, half, empty } = ratingStars(average ?? 0);

  return (
    <ul className="rating-list">
      {Array.from({ length: full }).map((_, index) => (
        <li className="rating-list__item" key={`full-${index}`}>
          <i className="las la-star" />
        </li>
      ))}
      {half && (
        <li className="rating-list__item">
          <i className="las la-star-half-alt" />
        </li>
      )}
      {Array.from({ length: empty }).map((_, index) => (
        <li className="rating-list__item" key={`empty-${index}`}>
          <i className="lar la-star" />
        </li>
      ))}
      {showCount && (
        <li className="rating-list__item">
          <span className="rating-list__text">({countLabel ?? total ?? 0})</span>
        </li>
      )}
    </ul>
  );
}
