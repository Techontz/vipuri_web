'use client';

import type { Pagination as PaginationMeta } from '@/types';

/**
 * Pagination control using the theme's `.pagination` markup so it inherits the
 * original styling.
 */
export function Pagination({
  pagination,
  onChange,
}: {
  pagination: PaginationMeta;
  onChange: (page: number) => void;
}) {
  const { current_page: current, last_page: last } = pagination;

  if (last <= 1) return null;

  const pages: (number | '…')[] = [];
  const push = (value: number | '…') => {
    if (pages[pages.length - 1] !== value) pages.push(value);
  };

  for (let page = 1; page <= last; page++) {
    if (page === 1 || page === last || Math.abs(page - current) <= 2) {
      push(page);
    } else {
      push('…');
    }
  }

  return (
    <div className="pagination-wrapper">
      <ul className="pagination">
        <li className={`page-item ${current === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            type="button"
            disabled={current === 1}
            onClick={() => onChange(current - 1)}
            aria-label="Previous page"
          >
            <i className="las la-angle-left" />
          </button>
        </li>

        {pages.map((page, index) =>
          page === '…' ? (
            <li className="page-item disabled" key={`gap-${index}`}>
              <span className="page-link">…</span>
            </li>
          ) : (
            <li className={`page-item ${page === current ? 'active' : ''}`} key={page}>
              <button className="page-link" type="button" onClick={() => onChange(page)}>
                {page}
              </button>
            </li>
          ),
        )}

        <li className={`page-item ${current === last ? 'disabled' : ''}`}>
          <button
            className="page-link"
            type="button"
            disabled={current === last}
            onClick={() => onChange(current + 1)}
            aria-label="Next page"
          >
            <i className="las la-angle-right" />
          </button>
        </li>
      </ul>
    </div>
  );
}
