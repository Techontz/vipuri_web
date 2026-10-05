/**
 * Colour family for status pills (`.status-pill--<tone>`), keyed on the
 * backend's status codes (App\Constants\Status).
 */

export type Tone = 'success' | 'danger' | 'info' | 'warning';

/** Order: delivered → green, cancelled/returned → red, in progress → blue. */
export function orderTone(status: number): Tone {
  switch (status) {
    case 4:
      return 'success';
    case 6:
    case 7:
      return 'danger';
    case 1:
    case 2:
    case 3:
      return 'info';
    default:
      return 'warning';
  }
}

/** Payment: paid → green, rejected → red, awaiting → amber. */
export function paymentTone(status: number): Tone {
  switch (status) {
    case 1:
      return 'success';
    case 3:
      return 'danger';
    default:
      return 'warning';
  }
}

/**
 * Customer-facing payment wording. The backend labels (e.g. "Initiated") are
 * written for staff; customers see plain language instead.
 */
export function paymentLabel(status: number, fallbackLabel?: string | null): string {
  switch (status) {
    case 0:
      return 'Awaiting payment';
    case 1:
      return 'Paid';
    case 2:
      return 'Payment under review';
    case 3:
      return 'Payment rejected';
    default:
      return fallbackLabel || 'Awaiting payment';
  }
}

/** Support ticket status (App\Constants\Status::TICKET_*). */
export function ticketLabel(status: number): string {
  switch (status) {
    case 1:
      return 'Answered';
    case 2:
      return 'Customer reply';
    case 3:
      return 'Closed';
    default:
      return 'Open';
  }
}

/** Open → amber, answered / awaiting staff → blue, closed → green. */
export function ticketTone(status: number): Tone {
  switch (status) {
    case 1:
    case 2:
      return 'info';
    case 3:
      return 'success';
    default:
      return 'warning';
  }
}

/** "Dar es Salaam, Dar es Salaam" → "Dar es Salaam": drop the region when it repeats the city. */
export function formatPlace(city?: string | null, state?: string | null): string {
  const c = (city ?? '').trim();
  const s = (state ?? '').trim();
  if (!c) return s;
  if (!s || s.toLowerCase() === c.toLowerCase()) return c;
  return `${c}, ${s}`;
}
