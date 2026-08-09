'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAdmin } from '@/components/admin/AdminProviders';
import { api } from '@/lib/api';
import { formatDate, imageUrl } from '@/lib/format';

type MenuItem = {
  label: string;
  href?: string;
  icon: string;
  permission?: string;
  superAdminOnly?: boolean;
  children?: { label: string; href: string; permission?: string; superAdminOnly?: boolean }[];
};

/**
 * Admin navigation, mirroring the structure of the source system's
 * `admin/partials/sidenav.json` and adding the VIPURI branch sections.
 */
const MENU: (MenuItem | { header: string })[] = [
  { label: 'Dashboard', href: '/admin', icon: 'las la-home', permission: 'dashboard.view' },

  { header: 'VIPURI Network' },
  {
    label: 'Branches',
    icon: 'las la-store',
    permission: 'branch.view',
    children: [
      { label: 'All Branches', href: '/admin/branches', permission: 'branch.view' },
      { label: 'Performance', href: '/admin/branches/performance', permission: 'report.branch_performance' },
    ],
  },
  {
    label: 'Staff',
    icon: 'las la-user-shield',
    permission: 'staff.view',
    children: [
      { label: 'All Staff', href: '/admin/staff', permission: 'staff.view' },
      { label: 'Roles & Permissions', href: '/admin/staff/roles', permission: 'staff.view' },
    ],
  },

  { header: 'Catalogue' },
  {
    label: 'Products',
    icon: 'las la-boxes',
    permission: 'product.view',
    children: [
      { label: 'All Products', href: '/admin/products', permission: 'product.view' },
      { label: 'Add Product', href: '/admin/products/create', permission: 'product.create' },
      { label: 'Categories', href: '/admin/categories', permission: 'category.manage' },
      { label: 'Brands', href: '/admin/brands', permission: 'brand.manage' },
      { label: 'Attributes', href: '/admin/attributes', permission: 'attribute.manage' },
      { label: 'Reviews', href: '/admin/reviews', permission: 'review.manage' },
    ],
  },
  {
    label: 'Inventory',
    icon: 'las la-warehouse',
    permission: 'inventory.view',
    children: [
      { label: 'Branch Stock', href: '/admin/inventory', permission: 'inventory.view' },
      { label: 'Stock Transfers', href: '/admin/inventory/transfers', permission: 'inventory.view' },
      { label: 'Movement History', href: '/admin/inventory/history', permission: 'inventory.history' },
    ],
  },

  { header: 'Sales' },
  { label: 'Orders', href: '/admin/orders', icon: 'las la-shopping-cart', permission: 'order.view' },
  { label: 'Payments', href: '/admin/deposits', icon: 'las la-money-check', permission: 'deposit.view' },
  { label: 'Customers', href: '/admin/customers', icon: 'las la-users', permission: 'customer.view' },

  { header: 'Marketing' },
  {
    label: 'Promotions',
    icon: 'las la-bullhorn',
    permission: 'coupon.manage',
    children: [
      { label: 'Coupons', href: '/admin/coupons', permission: 'coupon.manage' },
      { label: 'Offers', href: '/admin/offers', permission: 'offer.manage' },
      { label: 'Campaigns', href: '/admin/campaigns', permission: 'campaign.manage' },
      { label: 'Subscribers', href: '/admin/subscribers', permission: 'subscriber.manage' },
    ],
  },

  { header: 'Operations' },
  { label: 'Shipping', href: '/admin/shipping', icon: 'las la-truck', permission: 'shipping.manage' },
  { label: 'Payment Gateways', href: '/admin/gateways', icon: 'las la-credit-card', permission: 'gateway.manage' },
  { label: 'Support Tickets', href: '/admin/tickets', icon: 'las la-headset', permission: 'ticket.view' },

  { header: 'Insight' },
  {
    label: 'Reports',
    icon: 'las la-chart-bar',
    permission: 'report.sales',
    children: [
      { label: 'Sales', href: '/admin/reports/sales', permission: 'report.sales' },
      { label: 'Inventory', href: '/admin/reports/inventory', permission: 'report.inventory' },
      { label: 'Branch Performance', href: '/admin/reports/branch-performance', permission: 'report.branch_performance' },
      { label: 'Login History', href: '/admin/reports/login-history', permission: 'report.login_history' },
      { label: 'Notifications', href: '/admin/reports/notifications', permission: 'report.notification_history' },
      { label: 'Audit Log', href: '/admin/reports/audit-log', permission: 'report.audit_log' },
    ],
  },

  { header: 'System' },
  {
    label: 'Settings',
    icon: 'las la-cog',
    permission: 'setting.general',
    children: [
      { label: 'General', href: '/admin/settings/general', permission: 'setting.general' },
      { label: 'Company Profile', href: '/admin/settings/company', permission: 'setting.company' },
      { label: 'AI Configuration', href: '/admin/settings/ai', permission: 'setting.ai' },
      { label: 'Social Login', href: '/admin/settings/social-login', permission: 'setting.general' },
      { label: 'Languages', href: '/admin/settings/languages', permission: 'language.manage' },
      { label: 'Extensions', href: '/admin/settings/extensions', permission: 'extension.manage' },
      { label: 'Notification Templates', href: '/admin/settings/notifications', permission: 'setting.notification' },
      { label: 'System Info', href: '/admin/settings/system', permission: 'setting.system' },
    ],
  },
];

type NotificationRow = { id: number; title: string; click_url: string | null; is_read: boolean; created_at: string };

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, loading, isAuthenticated, can, isSuperAdmin, logout } = useAdmin();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    api<{ notifications: NotificationRow[]; unread: number }>('/admin/notifications', { auth: 'admin' })
      .then((data) => {
        setNotifications((data.notifications ?? []).slice(0, 8));
        setUnread(data.unread ?? 0);
      })
      .catch(() => undefined);
  }, [isAuthenticated, pathname]);

  // Keep the group containing the current route expanded.
  useEffect(() => {
    const next: Record<string, boolean> = {};

    MENU.forEach((entry) => {
      if ('header' in entry || !entry.children) return;
      if (entry.children.some((child) => pathname.startsWith(child.href))) next[entry.label] = true;
    });

    setOpenGroups((current) => ({ ...current, ...next }));
  }, [pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading || !isAuthenticated) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div className="spinner-border" role="status" />
          <p className="mt-3 mb-0">Loading the VIPURI admin…</p>
        </div>
      </div>
    );
  }

  const visible = (item: { permission?: string; superAdminOnly?: boolean }) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    return item.permission ? can(item.permission) : true;
  };

  return (
    <div className="page-wrapper default-version">
      {/* ------------------------------ Sidebar ------------------------------ */}
      <div className={`sidebar bg--dark ${sidebarOpen ? 'active' : ''}`}>
        <button className="res-sidebar-close-btn" type="button" onClick={() => setSidebarOpen(false)}>
          <i className="las la-times" />
        </button>
        <div className="sidebar__inner">
          <div className="sidebar__logo">
            <Link href="/admin" className="sidebar__main-logo">
              <img src="/assets/images/logo_icon/logo-dark.svg" alt="VIPURI" />
            </Link>
          </div>
          <div className="sidebar__menu-wrapper">
            <ul className="sidebar__menu">
              {MENU.map((entry, index) => {
                if ('header' in entry) {
                  return (
                    <li className="sidebar__menu-header" key={`header-${index}`}>
                      {entry.header}
                    </li>
                  );
                }

                if (!visible(entry)) return null;

                if (entry.children) {
                  const children = entry.children.filter(visible);
                  if (children.length === 0) return null;

                  const open = openGroups[entry.label];

                  return (
                    <li className="sidebar-menu-item sidebar-dropdown" key={entry.label}>
                      <a
                        href="#"
                        className={open ? 'active' : ''}
                        onClick={(event) => {
                          event.preventDefault();
                          setOpenGroups((current) => ({ ...current, [entry.label]: !current[entry.label] }));
                        }}
                      >
                        <i className={`menu-icon ${entry.icon}`} />
                        <span className="menu-title">{entry.label}</span>
                      </a>
                      <div className={`sidebar-submenu ${open ? 'show' : ''}`} style={{ display: open ? 'block' : 'none' }}>
                        <ul>
                          {children.map((child) => (
                            <li
                              className={`sidebar-menu-item ${pathname === child.href ? 'active' : ''}`}
                              key={child.href}
                            >
                              <Link href={child.href} className="nav-link">
                                <i className="menu-icon las la-dot-circle" />
                                <span className="menu-title">{child.label}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  );
                }

                return (
                  <li
                    className={`sidebar-menu-item ${pathname === entry.href ? 'active' : ''}`}
                    key={entry.href ?? entry.label}
                  >
                    <Link href={entry.href ?? '#'} className="nav-link">
                      <i className={`menu-icon ${entry.icon}`} />
                      <span className="menu-title">{entry.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* ------------------------------ Topbar ------------------------------- */}
      <nav className="navbar-wrapper bg--dark d-flex flex-wrap">
        <div className="navbar__left">
          <button type="button" className="res-sidebar-open-btn me-3" onClick={() => setSidebarOpen(true)}>
            <i className="las la-bars" />
          </button>
          <span className="branch-scope">
            <i className="las la-map-marker-alt" />
            {isSuperAdmin ? 'All branches' : admin?.branch?.name ?? 'No branch'}
          </span>
        </div>

        <div className="navbar__right">
          <ul className="navbar__action-list">
            <li>
              <button type="button" className="primary--layer" title="Visit storefront">
                <a href="/" target="_blank" rel="noreferrer">
                  <i className="las la-globe" />
                </a>
              </button>
            </li>

            <li className="dropdown">
              <button
                type="button"
                className="primary--layer notification-bell"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className={`las la-bell ${unread > 0 ? 'icon-left-right' : ''}`} />
                {unread > 0 && <span className="notification-count">{unread <= 9 ? unread : '9+'}</span>}
              </button>
              <div className="dropdown-menu dropdown-menu--md p-0 border-0 box--shadow1 dropdown-menu-end">
                <div className="dropdown-menu__header">
                  <span className="caption">Notifications</span>
                  {unread > 0 && <p>You have {unread} unread notifications</p>}
                </div>
                <div className="dropdown-menu__body">
                  {notifications.length === 0 ? (
                    <p className="text-center py-3 mb-0">Nothing new</p>
                  ) : (
                    notifications.map((notification) => (
                      <Link
                        className="dropdown-menu__item"
                        href={notification.click_url ?? '/admin'}
                        key={notification.id}
                        onClick={() => {
                          void api(`/admin/notifications/${notification.id}/read`, {
                            method: 'POST',
                            auth: 'admin',
                          });
                        }}
                      >
                        <div className="navbar__content">
                          <p className="text mb-0">{notification.title}</p>
                          <span className="time">{formatDate(notification.created_at, true)}</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </li>

            <li className="dropdown">
              <button type="button" className="primary--layer" data-bs-toggle="dropdown" aria-expanded="false">
                <img
                  src={imageUrl(admin?.image ?? '/assets/images/avatar.png')}
                  alt={admin?.name}
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                />
              </button>
              <div className="dropdown-menu dropdown-menu-end">
                <div className="px-3 py-2">
                  <strong className="d-block">{admin?.name}</strong>
                  <span style={{ fontSize: 13 }}>{admin?.role}</span>
                </div>
                <div className="dropdown-divider" />
                <Link className="dropdown-item" href="/admin/profile">
                  <i className="las la-user me-2" /> Profile
                </Link>
                <Link className="dropdown-item" href="/admin/change-password">
                  <i className="las la-lock me-2" /> Change password
                </Link>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => {
                    void logout().then(() => router.push('/admin/login'));
                  }}
                >
                  <i className="las la-sign-out-alt me-2" /> Logout
                </button>
              </div>
            </li>
          </ul>
        </div>
      </nav>

      <div className="container-fluid px-3 px-sm-0">
        <div className="body-wrapper">
          <div className="bodywrapper__inner">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Page heading strip, matching `admin/partials/breadcrumb.blade.php`. */
export function AdminPageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="d-flex mb-30 flex-wrap gap-3 justify-content-between align-items-center">
      <h6 className="page-title">{title}</h6>
      <div className="d-flex flex-wrap justify-content-end gap-2 align-items-center breadcrumb-plugins">{children}</div>
    </div>
  );
}

/** Stat tile, matching the theme's `widget-seven`. */
export function AdminWidget({
  title,
  value,
  icon,
  bg = 'primary',
  href,
}: {
  title: string;
  value: string | number;
  icon: string;
  bg?: string;
  href?: string;
}) {
  const body = (
    <div className={`widget-seven bg--${bg}`}>
      <div className="widget-seven__content">
        <span className="widget-seven__content-icon">
          <span className="icon">
            <i className={icon} />
          </span>
        </span>
        <div className="widget-seven__description">
          <p className="widget-seven__content-title">{title}</p>
          <h3 className="widget-seven__content-amount">{value}</h3>
        </div>
      </div>
      {href && (
        <span className="widget-seven__arrow">
          <i className="fas fa-chevron-right" />
        </span>
      )}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
