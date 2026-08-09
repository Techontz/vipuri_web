'use client';

import { useEffect, useState } from 'react';

/**
 * The theme's stepper control. Uses the same markup and classes as the
 * original `.product-qty` widget so the styling and hover states match, but
 * drives state through React instead of the theme's global jQuery handlers.
 */
export function QuantityInput({
  value,
  min = 1,
  max,
  disabled = false,
  onChange,
  className = '',
}: {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (quantity: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (next: number) => {
    let result = Number.isFinite(next) ? next : min;
    if (result < min) result = min;
    if (max && max > 0 && result > max) result = max;
    return result;
  };

  const commit = (next: number) => {
    const clamped = clamp(next);
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className={`product-qty ${className}`.trim()}>
      <button
        type="button"
        className="product-qty__btn productQtyDecrement minusQty"
        disabled={disabled || value <= min}
        onClick={() => commit(value - 1)}
        aria-label="Decrease quantity"
      >
        <i className="fas fa-minus" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        className="product-qty__value quantityInput cartItemQty"
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit(Number(draft))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit(Number(draft));
          }
        }}
      />
      <button
        type="button"
        className="product-qty__btn productQtyIncrement plusQty"
        disabled={disabled || (max ? value >= max : false)}
        onClick={() => commit(value + 1)}
        aria-label="Increase quantity"
      >
        <i className="las la-plus" />
      </button>
    </div>
  );
}
