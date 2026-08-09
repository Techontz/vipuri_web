'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { LanguageDropdown } from '@/components/layout/LanguageDropdown';
import { useTranslate } from '@/components/providers/LanguageProvider';
import { useSettings } from '@/components/providers/AppProviders';
import { ApiError, api } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import type { CategoryNode } from '@/types';

/** Storefront footer, mirroring `partials/footer.blade.php`. */
export function SiteFooter() {
  const t = useTranslate();
  const settings = useSettings();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api<{ categories: CategoryNode[] }>('/categories?parents_only=1', { cache: 'force-cache' })
      .then((data) => {
        if (!cancelled) setCategories((data.categories ?? []).slice(0, 3));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const contact = settings?.contact ?? {};
  const footer = settings?.footer ?? {};
  const policies = settings?.policy_pages ?? [];
  const socials = settings?.socials ?? [];

  const subscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      toastError('The email field is required');
      return;
    }

    setSubmitting(true);

    try {
      await api('/subscribe', { method: 'POST', body: { email: email.trim() } });
      toastSuccess('Thank you for subscribing to VIPURI updates');
      setEmail('');
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="row gy-4">
            <div className="col-xl-8">
              <div className="footer-main">
                <div className="footer-main__header">
                  <Link className="footer-logo" href="/">
                    <img src={settings?.site.logo ?? '/assets/images/logo_icon/logo-dark.svg'} alt="logo" />
                  </Link>
                  <p className="footer-desc">{footer.short_description ?? ''}</p>
                </div>
                <div className="footer-main__body">
                  <div className="row gy-4">
                    <div className="col-sm-6 col-lg-3">
                      <div className="footer-item">
                        <h3 className="footer-item__title h6">{t('Quick Links')}</h3>
                        <ul className="footer-menu">
                          <li className="footer-menu__item">
                            <Link className="footer-menu__link" href="/">
                              {t('Home')}
                            </Link>
                          </li>
                          <li className="footer-menu__item">
                            <Link className="footer-menu__link" href="/products">
                              {t('Shop')}
                            </Link>
                          </li>
                          <li className="footer-menu__item">
                            <Link className="footer-menu__link" href="/branches">
                              {t('Our Branches')}
                            </Link>
                          </li>
                          <li className="footer-menu__item">
                            <Link className="footer-menu__link" href="/contact">
                              {t('Contact')}
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="col-sm-6 col-lg-3">
                      <div className="footer-item">
                        <h3 className="footer-item__title h6">{t('Categories')}</h3>
                        <ul className="footer-menu">
                          {categories.map((category) => (
                            <li className="footer-menu__item" key={category.id}>
                              <Link className="footer-menu__link" href={`/products?category=${category.slug}`}>
                                {category.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="col-sm-6 col-lg-3">
                      <div className="footer-item">
                        <h3 className="footer-item__title h6">{t('Policy Links')}</h3>
                        <ul className="footer-menu">
                          {policies.map((page) => (
                            <li className="footer-menu__item" key={page.slug}>
                              <Link className="footer-menu__link" href={`/policy/${page.slug}`}>
                                {page.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="col-sm-6 col-lg-3">
                      <div className="footer-item">
                        <h4 className="footer-item__title h6">{t('Contact Info')}</h4>
                        <ul className="footer-contact-menu">
                          <li className="footer-contact-menu__item">
                            <div className="footer-contact-menu__icon">
                              <i className="las la-phone" />
                            </div>
                            <a className="footer-contact-menu__link" href={`tel:${contact.number ?? ''}`}>
                              {contact.number ?? ''}
                            </a>
                          </li>
                          <li className="footer-contact-menu__item">
                            <div className="footer-contact-menu__icon">
                              <i className="las la-envelope" />
                            </div>
                            <a className="footer-contact-menu__link" href={`mailto:${contact.email_address ?? ''}`}>
                              {contact.email_address ?? ''}
                            </a>
                          </li>
                          <li className="footer-contact-menu__item">
                            <div className="footer-contact-menu__icon">
                              <i className="las la-map-marker-alt" />
                            </div>
                            <p className="footer-contact-menu__link address">{contact.address ?? ''}</p>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-4">
              <div className="footer-subscribe">
                <div className="footer-subscribe__header">
                  <h5 className="footer-subscribe__title">{footer.subscriber_title ?? 'Want to stay up to date?'}</h5>
                  <p className="footer-subscribe__desc">
                    {footer.subscriber_desc ?? 'Subscribe for updates, notifications, and exclusive offers.'}
                  </p>
                </div>
                <div className="footer-subscribe__body">
                  <form className="footer-subscribe-form" onSubmit={subscribe}>
                    <input
                      className="form-control form--control"
                      type="email"
                      name="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                    <button className="btn btn--icon btn--base" type="submit" disabled={submitting} aria-label="Subscribe">
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
                        className="lucide lucide-send-icon lucide-send"
                      >
                        <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
                        <path d="m21.854 2.147-10.94 10.939" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>

              <div className="footer-action">
                <div className="footer-action__header">
                  <h6 className="footer-action__title">Social &amp; Branches</h6>
                </div>
                <div className="footer-action__body">
                  <ul className="social-list">
                    {socials.length > 0 ? (
                      socials.map((social, index) => (
                        <li className="social-list__item" key={`${social.url}-${index}`}>
                          <a
                            className="social-list__link"
                            href={social.url ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={social.title ?? 'Social link'}
                            dangerouslySetInnerHTML={{ __html: social.social_icon ?? '' }}
                          />
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="social-list__item">
                          <a className="social-list__link" href="https://facebook.com" target="_blank" rel="noreferrer">
                            <i className="fab fa-facebook-f" />
                          </a>
                        </li>
                        <li className="social-list__item">
                          <a className="social-list__link" href="https://x.com" target="_blank" rel="noreferrer">
                            <i className="fa-brands fa-x-twitter" />
                          </a>
                        </li>
                        <li className="social-list__item">
                          <a className="social-list__link" href="https://linkedin.com" target="_blank" rel="noreferrer">
                            <i className="fab fa-linkedin-in" />
                          </a>
                        </li>
                        <li className="social-list__item">
                          <a className="social-list__link" href="https://instagram.com" target="_blank" rel="noreferrer">
                            <i className="lab la-instagram" />
                          </a>
                        </li>
                      </>
                    )}
                  </ul>

                  <LanguageDropdown />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            Copyright &copy; {new Date().getFullYear()} <Link href="/">{settings?.site.name ?? 'VIPURI'}</Link>. All
            Rights Reserved
          </p>
          <ul className="footer-payment">
            {(settings?.footer_payments ?? []).map((payment) => (
              <li className="footer-payment__item" key={payment.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="footer-payment__logo" src={payment.image ?? ''} alt="image" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
