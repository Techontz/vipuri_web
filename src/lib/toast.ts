'use client';

/**
 * Toast notifications, wired to the same iziToast styling the original theme
 * used so success and error feedback looks identical.
 */

type ToastStatus = 'success' | 'error' | 'warning' | 'info';

type IziToast = Record<ToastStatus, (options: Record<string, unknown>) => void>;

const COLORS: Record<ToastStatus, string> = {
  success: '#28c76f',
  error: '#eb2222',
  warning: '#ff9f43',
  info: '#1e9ff2',
};

const ICONS: Record<ToastStatus, string> = {
  success: 'fas fa-check-circle',
  error: 'fas fa-times-circle',
  warning: 'fas fa-exclamation-triangle',
  info: 'fas fa-exclamation-circle',
};

function izi(): IziToast | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { iziToast?: IziToast }).iziToast ?? null;
}

export function notify(status: ToastStatus, message: string | string[]) {
  const messages = Array.isArray(message) ? message : [message];
  const toast = izi();

  if (!toast) {
    // The toast bundle has not loaded yet (or JS is running server-side in a
    // test); fall back to the console so nothing is silently swallowed.
    messages.forEach((text) => console[status === 'error' ? 'error' : 'log'](text));
    return;
  }

  messages.forEach((text) => {
    toast[status]({
      title: status.charAt(0).toUpperCase() + status.slice(1),
      message: text,
      position: 'topRight',
      backgroundColor: '#fff',
      icon: ICONS[status],
      iconColor: COLORS[status],
      progressBarColor: COLORS[status],
      titleSize: '1rem',
      messageSize: '1rem',
      titleColor: '#474747',
      messageColor: '#a2a2a2',
      transitionIn: 'bounceInLeft',
      transitionOut: 'fadeOutRight',
    });
  });
}

export const toastSuccess = (message: string | string[]) => notify('success', message);
export const toastError = (message: string | string[]) => notify('error', message);
export const toastWarning = (message: string | string[]) => notify('warning', message);
export const toastInfo = (message: string | string[]) => notify('info', message);
