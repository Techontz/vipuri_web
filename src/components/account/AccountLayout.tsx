'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useTranslate } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatDate, imageUrl } from '@/lib/format';

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
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, isAuthenticated, pathname, router]);

  // On narrow screens the menu is a horizontally scrolling chip row: keep the
  // active chip in view without moving the page vertically.
  useEffect(() => {
    const menu = menuRef.current;
    const active = menu?.querySelector<HTMLElement>('.account-menu__item.active');
    if (!menu || !active || menu.scrollWidth <= menu.clientWidth) return;
    menu.scrollLeft = active.offsetLeft - (menu.clientWidth - active.offsetWidth) / 2;
  }, [pathname, isAuthenticated]);

  // The banner names the screen; order and ticket detail pages name the
  // record itself while their section stays highlighted in the menu.
  const current = MENU.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const detail = pathname.match(/^\/user\/(orders|tickets)\/([^/]+)\/?$/);
  const title = detail
    ? `${detail[1] === 'orders' ? 'Order' : 'Ticket'} #${decodeURIComponent(detail[2])}`
    : (current?.label ?? 'My Account');

  if (loading || !isAuthenticated) {
    return (
      <>
        <Breadcrumb title={title} />
        <section className="dashboard my-60">
          <div className="container">
            <div className="vp-skeleton vp-skeleton--title" />
            <div className="vp-skeleton vp-skeleton--line" />
            <div className="vp-skeleton vp-skeleton--line" />
          </div>
        </section>
      </>
    );
  }

  const name = user?.fullname?.trim() || user?.username || 'Customer';
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'V';

  return (
    <>
      <Breadcrumb title={title} />

      <section className="dashboard my-60">
        <div className="container">
          <div className="row gy-4">
            <div className="col-lg-3">
              <aside className="dashboard-sidebar">
                <div className="dashboard-sidebar__header">
                  <div className="dashboard-user">
                    {user?.image ? (
                      <img className="dashboard-user__thumb" src={imageUrl(user.image)} alt={name} />
                    ) : (
                      <span className="dashboard-user__thumb dashboard-user__thumb--initials" aria-hidden="true">
                        {initials}
                      </span>
                    )}
                    <div className="dashboard-user__content">
                      <h6 className="dashboard-user__name">{name}</h6>
                      <span className="dashboard-user__email">{user?.email}</span>
                      {user?.created_at && (
                        <span className="dashboard-user__since">Member since {formatDate(user.created_at)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dashboard-sidebar__body">
                  <ul className="account-menu" ref={menuRef}>
                    {MENU.map((item) => (
                      <li className={`account-menu__item ${current?.href === item.href ? 'active' : ''}`} key={item.href}>
                        <Link
                          className="account-menu__link"
                          href={item.href}
                          aria-current={current?.href === item.href ? 'page' : undefined}
                        >
                          <span className="icon">
                            <i className={item.icon} />
                          </span>
                          <span className="text">{item.label}</span>
                          <i className="las la-angle-right account-menu__arrow" />
                        </Link>
                      </li>
                    ))}
                    <li className="account-menu__item account-menu__item--logout">
                      <button
                        className="account-menu__link"
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
              </aside>
            </div>

            <div className="col-lg-9">{children}</div>
          </div>
        </div>
      </section>
    </>
  );
}
