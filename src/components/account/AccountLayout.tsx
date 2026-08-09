'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useTranslate } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { imageUrl } from '@/lib/format';

const MENU = [
  { href: '/user/dashboard', label: 'Dashboard', icon: 'las la-tachometer-alt' },
  { href: '/user/orders', label: 'My Orders', icon: 'las la-shopping-bag' },
  { href: '/user/addresses', label: 'Addresses', icon: 'las la-map-marker-alt' },
  { href: '/user/reviews', label: 'Reviews', icon: 'las la-star' },
  { href: '/user/payments', label: 'Payments', icon: 'las la-credit-card' },
  { href: '/user/tickets', label: 'Support', icon: 'las la-headset' },
  { href: '/user/notifications', label: 'Notifications', icon: 'las la-bell' },
  { href: '/user/profile', label: 'Profile Setting', icon: 'las la-user' },
  { href: '/user/change-password', label: 'Change Password', icon: 'las la-lock' },
];

/**
 * Customer dashboard shell, mirroring the theme's `partials/sidebar.blade.php`
 * plus the user layout. Unauthenticated visitors are bounced to login with a
 * redirect back to where they were heading.
 */
export function AccountLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslate();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, isAuthenticated, pathname, router]);

  if (loading || !isAuthenticated) {
    return (
      <section className="my-120">
        <div className="container">
          <div className="vp-skeleton vp-skeleton--title" />
          <div className="vp-skeleton vp-skeleton--line" />
          <div className="vp-skeleton vp-skeleton--line" />
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard my-120">
      <div className="container">
        <div className="row gy-4">
          <div className="col-lg-3">
            <div className="dashboard-sidebar">
              <div className="dashboard-sidebar__header">
                <div className="dashboard-user">
                  <img
                    className="dashboard-user__thumb"
                    src={imageUrl(user?.image ?? '/assets/images/avatar.png')}
                    alt={user?.fullname ?? 'Customer'}
                  />
                  <div className="dashboard-user__content">
                    <h6 className="dashboard-user__name">{user?.fullname || user?.username}</h6>
                    <span className="dashboard-user__email">{user?.email}</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-sidebar__body">
                <ul className="sidebar-menu">
                  {MENU.map((item) => (
                    <li
                      className={`sidebar-menu__item ${pathname === item.href ? 'active' : ''}`}
                      key={item.href}
                    >
                      <Link className="sidebar-menu__link" href={item.href}>
                        <span className="icon">
                          <i className={item.icon} />
                        </span>
                        <span className="text">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                  <li className="sidebar-menu__item">
                    <button
                      className="sidebar-menu__link"
                      type="button"
                      onClick={() => {
                        void logout().then(() => router.push('/'));
                      }}
                    >
                      <span className="icon">
                        <i className="las la-sign-out-alt" />
                      </span>
                      <span className="text">{t('Logout')}</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="col-lg-9">{children}</div>
        </div>
      </div>
    </section>
  );
}
