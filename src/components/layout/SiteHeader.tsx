'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useTranslate } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useSettings } from '@/components/providers/AppProviders';
import { CartSidebar } from '@/components/layout/CartSidebar';
import { api } from '@/lib/api';
import { imageUrl } from '@/lib/format';
import type { CategoryNode } from '@/types';

/**
 * The VIPURI logo, served straight from `public/`. The space in the filename is
 * percent-encoded because this is a URL, not a module import.
 *
 * Used when the operator has not uploaded a logo in the CMS, which is still
 * what `settings.site.logo` provides when they have.
 */
const LOGO_SRC = '/assets/images/logo_icon/vipuri%20logo.png';

/**
 * Storefront header. The markup mirrors the purchased theme's
 * `partials/header.blade.php` element-for-element so the compiled CSS applies
 * unchanged — only the data source and routing differ.
 */
export function SiteHeader() {
  const t = useTranslate();
  const pathname = usePathname();
  const router = useRouter();
  const settings = useSettings();
  const { isAuthenticated, logout } = useAuth();
  const { summary, wishlistCount } = useCart();

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    api<{ categories: CategoryNode[] }>('/categories?navbar=1&parents_only=1', {
      cache: 'force-cache',
    })
      .then((data) => {
        if (!cancelled) setCategories(data.categories ?? []);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const isHome = pathname === '/';
  const contact = settings?.contact ?? {};
  const pages = settings?.pages ?? [];

  const active = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? 'active' : '');

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = search.trim();
    router.push(term ? `/products?search=${encodeURIComponent(term)}` : '/products');
  };

  const cartCount = summary.cart_count ?? 0;

  return (
    <>
      {/* ==================== Categories offcanvas ==================== */}
      <div className="offcanvas offcanvas-end categories--offcanvas" tabIndex={-1} id="categoryOffcanvas">
        <div className="offcanvas-header">
          <button
            type="button"
            className="btn btn--sm btn--close btn-soft--dark"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          />
          <h5 className="offcanvas-title">{t('All Categories')}</h5>
          <form className="input-group input--group" onSubmit={submitSearch}>
            <button type="submit" className="input-group-text">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-search-icon lucide-search"
              >
                <path d="m21 21-4.34-4.34" />
                <circle cx="11" cy="11" r="8" />
              </svg>
            </button>
            <input
              className="form-control form-control--sm form--control"
              name="search"
              type="search"
              placeholder="Search..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>
        </div>
        <div className="offcanvas-body">
          <div className="category-block">
            <ul className="category-block-list">
              {categories.map((category, index) => (
                <li className="category-block-list__item" key={category.id}>
                  <div className="category-block-list__link">
                    <img className="icon" src={imageUrl(category.icon)} alt="Toggle" />
                    <Link className="link" href={`/products?category=${category.slug}`}>
                      {category.name}
                    </Link>
                    {category.subcategories.length > 0 && (
                      <button
                        className="toggle"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#category-collapse-${index + 1}`}
                      >
                        <i className="las la-angle-right" />
                      </button>
                    )}
                  </div>

                  <div className="collapse" id={`category-collapse-${index + 1}`}>
                    {category.subcategories.map((sub, subIndex) => (
                      <div className="subcategory-block" key={sub.id}>
                        <div className="subcategory-block__toggle">
                          <img className="icon" src={imageUrl(sub.icon)} alt="image" />
                          <Link className="link" href={`/products?category=${sub.slug}`}>
                            {sub.name}
                          </Link>
                          {sub.subcategories.length > 0 && (
                            <button
                              className="toggle"
                              type="button"
                              data-bs-toggle="collapse"
                              data-bs-target={`#subcategory-collapse-${sub.slug}-${subIndex + 1}`}
                            >
                              <i className="las la-plus" />
                            </button>
                          )}
                        </div>
                        <div className="collapse" id={`subcategory-collapse-${sub.slug}-${subIndex + 1}`}>
                          <ul className="subcategory-block-list">
                            {sub.subcategories.map((child) => (
                              <li className="subcategory-block-list__item" key={child.id}>
                                <Link
                                  className="subcategory-block-list__link"
                                  href={`/products?category=${child.slug}`}
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ==================== Mobile menu offcanvas ==================== */}
      <div className="offcanvas offcanvas-end menu--offcanvas" tabIndex={-1} id="menuOffcanvas">
        <div className="offcanvas-header">
          <Link className="header-logo order-2" href="/">
            <img src={settings?.site.logo ?? LOGO_SRC} alt="VIPURI" />
          </Link>
          <button
            type="button"
            className="btn btn--sm btn--close btn-soft--dark"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          />
        </div>
        <div className="offcanvas-body">
          <ul className="header-menu style-two">
            <li className={`header-menu__item ${active('/products')}`}>
              <Link className="header-menu__link" href="/products">
                {t('Shop')}
              </Link>
            </li>
            {pages.map((page) => (
              <li className={`header-menu__item ${active(`/page/${page.slug}`)}`} key={page.id}>
                <Link className="header-menu__link" href={`/page/${page.slug}`}>
                  {page.name}
                </Link>
              </li>
            ))}
            <li className={`header-menu__item ${active('/blogs')}`}>
              <Link className="header-menu__link" href="/blogs">
                {t('Blog')}
              </Link>
            </li>
            <li className={`header-menu__item ${active('/branches')}`}>
              <Link className="header-menu__link" href="/branches">
                Branches
              </Link>
            </li>
            <li className={`header-menu__item ${active('/contact')}`}>
              <Link className="header-menu__link" href="/contact">
                {t('Contact')}
              </Link>
            </li>
            <li className={`header-menu__item ${active('/track-order')}`}>
              <Link className="header-menu__link" href="/track-order">
                {t('Track Order')}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* ==================== Header ==================== */}
      <header className={`header ${!isHome ? 'internal-page-header' : ''}`}>
        <div className="header-top">
          <div className="container">
            <div className="header-top__inner">
              <ul className="header-contact">
                <li className="header-contact__item">
                  <a
                    className="header-contact__link"
                    href={contact.email_address ? `mailto:${contact.email_address}` : undefined}
                  >
                    <span className="icon">
                      <i className="las la-envelope" />
                    </span>
                    <span className="text">{contact.email_address ?? ''}</span>
                  </a>
                </li>
                <li className="header-contact__item">
                  <a className="header-contact__link" href={contact.number ? `tel:${contact.number}` : undefined}>
                    <span className="icon">
                      <i className="las la-phone-alt" />
                    </span>
                    <span className="text">{contact.number ?? ''}</span>
                  </a>
                </li>
              </ul>
              <ul className="header-menu">
                <li className={`header-menu__item ${active('/products')}`}>
                  <Link className="header-menu__link" href="/products">
                    {t('Shop')}
                  </Link>
                </li>
                {pages.map((page) => (
                  <li className={`header-menu__item ${active(`/page/${page.slug}`)}`} key={page.id}>
                    <Link className="header-menu__link" href={`/page/${page.slug}`}>
                      {page.name}
                    </Link>
                  </li>
                ))}
                <li className={`header-menu__item ${active('/blogs')}`}>
                  <Link className="header-menu__link" href="/blogs">
                    {t('Blog')}
                  </Link>
                </li>
                <li className={`header-menu__item ${active('/branches')}`}>
                  <Link className="header-menu__link" href="/branches">
                    Branches
                  </Link>
                </li>
                <li className={`header-menu__item ${active('/contact')}`}>
                  <Link className="header-menu__link" href="/contact">
                    {t('Contact')}
                  </Link>
                </li>
                <li className={`header-menu__item ${active('/track-order')}`}>
                  <Link className="header-menu__link" href="/track-order">
                    {t('Track Order')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="header-bottom">
          <div className="container">
            <div className="header-bottom__inner">
              <Link className="header-logo order-2" href="/">
                <img src={settings?.site.logo ?? LOGO_SRC} alt="VIPURI" />
              </Link>

              <form className="header-search order-4 order-lg-3" onSubmit={submitSearch}>
                <input
                  className="header-search__input"
                  type="search"
                  name="search"
                  placeholder="Search Products"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <button className="header-search__btn" type="submit" aria-label="Search">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-search-icon lucide-search"
                  >
                    <path d="m21 21-4.34-4.34" />
                    <circle cx="11" cy="11" r="8" />
                  </svg>
                </button>
              </form>

              <div className="header-action order-3 order-lg-4">
                <ul className="header-option">
                  <li className="header-option__item">
                    <button
                      className="header-option__btn"
                      type="button"
                      data-bs-toggle="offcanvas"
                      data-bs-target="#categoryOffcanvas"
                      aria-controls="categoryOffcanvas"
                      aria-label="Categories"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-layout-grid-icon lucide-layout-grid"
                      >
                        <rect width="7" height="7" x="3" y="3" rx="1" />
                        <rect width="7" height="7" x="14" y="3" rx="1" />
                        <rect width="7" height="7" x="14" y="14" rx="1" />
                        <rect width="7" height="7" x="3" y="14" rx="1" />
                      </svg>
                    </button>
                  </li>
                  <li className="header-option__item">
                    <Link className="header-option__btn" href="/wishlist" aria-label="Wishlist">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-heart-icon lucide-heart"
                      >
                        <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                      </svg>
                      <span className={`calc-size count wishlistCount ${wishlistCount > 0 ? '' : 'd-none'}`}>
                        {wishlistCount}
                      </span>
                    </Link>
                  </li>
                  <li className="header-option__item">
                    <button
                      className="header-option__btn shop-cart"
                      type="button"
                      aria-label="Cart"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-shopping-cart-icon lucide-shopping-cart"
                      >
                        <circle cx="8" cy="21" r="1" />
                        <circle cx="19" cy="21" r="1" />
                        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                      </svg>
                      <span className={`calc-size count cartCount ${cartCount > 0 ? '' : 'd-none'}`}>{cartCount}</span>
                    </button>
                  </li>
                  <li className="header-option__item d-lg-none">
                    <button
                      className="header-option__btn"
                      type="button"
                      data-bs-toggle="offcanvas"
                      data-bs-target="#menuOffcanvas"
                      aria-controls="menuOffcanvas"
                      aria-label="Menu"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-menu-icon lucide-menu"
                      >
                        <path d="M4 5h16" />
                        <path d="M4 12h16" />
                        <path d="M4 19h16" />
                      </svg>
                    </button>
                  </li>
                </ul>

                {isAuthenticated ? (
                  <div className="dropdown dropdown--profile">
                    <button
                      className="dropdown-toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      aria-label="Account"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-user-icon lucide-user"
                      >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </button>
                    <div className="dropdown-menu dropdown-menu-end">
                      <div className="dropdown-menu__body">
                        <Link className="dropdown-item" href="/user/dashboard">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-layout-dashboard-icon"
                          >
                            <rect width="7" height="9" x="3" y="3" rx="1" />
                            <rect width="7" height="5" x="14" y="3" rx="1" />
                            <rect width="7" height="9" x="14" y="12" rx="1" />
                            <rect width="7" height="5" x="3" y="16" rx="1" />
                          </svg>
                          <span className="text">{t('Dashboard')}</span>
                        </Link>
                        <Link className="dropdown-item" href="/user/orders">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="text">{t('My Orders')}</span>
                        </Link>
                        <Link className="dropdown-item" href="/user/profile">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12C13.6569 12 15 10.6569 15 9Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M17 17C17 14.2386 14.7614 12 12 12C9.23858 12 7 14.2386 7 17"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span className="text">Profile Setting</span>
                        </Link>
                        <Link className="dropdown-item" href="/user/change-password">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M4.26781 18.8447C4.49269 20.515 5.87613 21.8235 7.55966 21.9009C8.97627 21.966 10.4153 22 12 22C13.5847 22 15.0237 21.966 16.4403 21.9009C18.1239 21.8235 19.5073 20.515 19.7322 18.8447C19.879 17.7547 20 16.6376 20 15.5C20 14.3624 19.879 13.2453 19.7322 12.1553C19.5073 10.485 18.1239 9.17649 16.4403 9.09909C15.0237 9.03397 13.5847 9 12 9C10.4153 9 8.97627 9.03397 7.55966 9.09909C5.87613 9.17649 4.49269 10.485 4.26781 12.1553C4.12105 13.2453 4 14.3624 4 15.5C4 16.6376 4.12105 17.7547 4.26781 18.8447Z"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path
                              d="M7.5 9V6.5C7.5 4.01472 9.51472 2 12 2C14.4853 2 16.5 4.01472 16.5 6.5V9"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span className="text">{t('Change Password')}</span>
                        </Link>
                        <button
                          className="dropdown-item logout"
                          type="button"
                          onClick={() => {
                            void logout().then(() => router.push('/'));
                          }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M15 17.625C14.9264 19.4769 13.3831 21.0494 11.3156 20.9988C10.8346 20.987 10.2401 20.8194 9.05112 20.484C6.18961 19.6768 3.70555 18.3203 3.10956 15.2815C3 14.723 3 14.0944 3 12.8373V11.1627C3 9.90561 3 9.27705 3.10956 8.71846C3.70555 5.67965 6.18961 4.32316 9.05112 3.51603C10.2401 3.18064 10.8346 3.01295 11.3156 3.00119C13.3831 2.95061 14.9264 4.52307 15 6.37501"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M21 12H10M21 12C21 11.2998 19.0057 9.99153 18.5 9.5M21 12C21 12.7002 19.0057 14.0085 18.5 14.5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span className="text">{t('Logout')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link className="header-user2" href="/login" aria-label="Sign in">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-user-icon lucide-user"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <CartSidebar />
    </>
  );
}
