'use client';

import { useEffect, useRef } from 'react';

import { Pagination } from '@/components/ui/Pagination';
import type { Pagination as PaginationMeta } from '@/types';

/**
 * Shared admin primitives built on the purchased admin theme's classes
 * (`.card box-shadow3`, `.table--light style--two`, `.btn--primary`, …) so
 * every new screen looks like it shipped with the original panel.
 */

export function Card({
  title,
  actions,
  children,
  className = '',
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card box-shadow3 ${className}`.trim()}>
      {(title || actions) && (
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          {title && <h5 className="card-title mb-0">{title}</h5>}
          {actions}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  empty = 'No records found',
  pagination,
  onPageChange,
  rowKey,
}: {
  columns: { key: string; label: string; align?: 'start' | 'center' | 'end'; render: (row: T) => React.ReactNode }[];
  rows: T[];
  loading?: boolean;
  empty?: string;
  pagination?: PaginationMeta | null;
  onPageChange?: (page: number) => void;
  rowKey: (row: T) => string | number;
}) {
  return (
    <>
      <div className="table-responsive">
        <table className="table table--light style--two">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.align ? `text-${column.align}` : undefined}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={columns.length}>
                    <div className="vp-skeleton vp-skeleton--line" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((column) => (
                    <td key={column.key} data-label={column.label} className={column.align ? `text-${column.align}` : undefined}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && onPageChange && pagination.last_page > 1 && (
        <div className="mt-3">
          <Pagination pagination={pagination} onChange={onPageChange} />
        </div>
      )}
    </>
  );
}

/** Accessible modal that does not depend on the theme's jQuery. */
export function Modal({
  open,
  title,
  onClose,
  children,
  size = 'md',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.removeProperty('overflow');
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div
        className="modal fade show"
        style={{ display: 'block' }}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => {
          if (event.target === ref.current) onClose();
        }}
        ref={ref}
      >
        <div className={`modal-dialog modal-dialog-centered modal-${size}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export function StatusBadge({ active, labels = ['Active', 'Inactive'] }: { active: boolean; labels?: [string, string] }) {
  return <span className={`badge badge--${active ? 'success' : 'warning'}`}>{active ? labels[0] : labels[1]}</span>;
}

export function StockPill({ quantity, minimum = 0 }: { quantity: number; minimum?: number }) {
  const level = quantity <= 0 ? 'out' : minimum > 0 && quantity <= minimum ? 'low' : 'ok';
  return <span className={`stock-pill ${level}`}>{quantity}</span>;
}

export function Field({
  label,
  children,
  required,
  hint,
  className = 'col-md-6',
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`form-group ${className}`}>
      <label className="form-label">
        {label} {required && <span className="text--danger">*</span>}
      </label>
      {children}
      {hint && <small className="d-block mt-1 text-muted">{hint}</small>}
    </div>
  );
}

export function ToggleButton({ active, onToggle, labels }: { active: boolean; onToggle: () => void; labels?: [string, string] }) {
  return (
    <button
      type="button"
      className={`btn btn--sm ${active ? 'btn--success' : 'btn--warning'}`}
      onClick={onToggle}
    >
      {active ? labels?.[0] ?? 'Active' : labels?.[1] ?? 'Inactive'}
    </button>
  );
}
