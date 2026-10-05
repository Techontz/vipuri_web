'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { ApiError, api, writeToken, USER_TOKEN_KEY } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Customer } from '@/types';

/**
 * Landing page for the OAuth round trip.
 *
 * The API redirects here with either a Sanctum token or an error message. The
 * token is stored, the profile fetched, and the URL replaced so the token never
 * lingers in history or gets shared by copying the address bar.
 */
export function SocialCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const { setSession } = useAuth();
  const { refresh, refreshWishlist } = useCart();
  const handled = useRef(false);

  const token = params.get('token');
  const error = params.get('error');

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (error || !token) {
      toastError(error || 'Sign-in failed. Please try again.');
      router.replace('/login');
      return;
    }

    // Store first: the profile request needs the bearer token.
    writeToken(USER_TOKEN_KEY, token);

    api<{ user: Customer }>('/auth/me', { auth: 'user' })
      .then(async (data) => {
        setSession(token, data.user);
        toastSuccess(`Welcome back, ${data.user.firstname}`);
        await Promise.all([refresh(), refreshWishlist()]);
        router.replace('/user/dashboard');
      })
      .catch((cause) => {
        writeToken(USER_TOKEN_KEY, null);
        toastError(cause instanceof ApiError ? cause.message : 'Sign-in failed. Please try again.');
        router.replace('/login');
      });
  }, [error, token, router, setSession, refresh, refreshWishlist]);

  return (
    <section className="account">
      <div className="account-content">
        <div className="account-content__body">
          <div className="account-card">
            <div className="account-card__body text-center">
              <h3 className="account-card__title">Signing you in…</h3>
              <p className="account-card__desc">One moment while we finish setting up your session.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
