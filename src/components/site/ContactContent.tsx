'use client';

import { useState } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useTranslate } from '@/components/providers/LanguageProvider';
import { useSettings } from '@/components/providers/AppProviders';
import { useCaptcha } from '@/components/ui/CaptchaField';
import { ApiError, apiWithMessage } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';

/**
 * A map embed worth rendering: a real Google Maps embed URL. The seeded link
 * carried a placeholder place id (`0x0`), which renders an empty grey box, so
 * that — and anything that is not an https URL — is treated as "no map".
 */
function usableMapLink(link: string | undefined): string | null {
  const value = (link ?? '').trim();
  if (!/^https:\/\//i.test(value)) return null;
  if (/(%3A|:)0x0(?![0-9a-f])/i.test(value)) return null;

  return value;
}

/** Contact page, mirroring `templates/basic/contact.blade.php`. */
export function ContactContent() {
  const t = useTranslate();
  const settings = useSettings();
  const contact = settings?.contact ?? {};
  const mapLink = usableMapLink(contact.google_map_link);

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const captcha = useCaptcha(settings?.captcha);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const { data, message } = await apiWithMessage<{ ticket_number: string }>('/contact', {
        method: 'POST',
        body: { ...form, ...captcha.answer() },
      });

      toastSuccess(message);
      setTicket(data.ticket_number);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Your message could not be sent');
      captcha.reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Breadcrumb title="Contact Us" />

      <section className="contact my-120">
        <div className="container">
          <div className="row gy-4">
            <div className="col-lg-4">
              <div className="contact-info-list">
                <div className="contact-info">
                  <div className="contact-info__icon">
                    <i className="las la-envelope" aria-hidden="true" />
                  </div>
                  <div className="contact-info__content">
                    <h6 className="contact-info__title">{contact.email_title ?? 'Email Us'}</h6>
                    <p className="contact-info__desc">{contact.email_desc}</p>
                    <a className="contact-info__link" href={`mailto:${contact.email_address ?? ''}`}>
                      {contact.email_address}
                    </a>
                  </div>
                </div>

                <div className="contact-info">
                  <div className="contact-info__icon">
                    <i className="las la-phone" aria-hidden="true" />
                  </div>
                  <div className="contact-info__content">
                    <h6 className="contact-info__title">{contact.number_title ?? 'Call Us'}</h6>
                    <p className="contact-info__desc">{contact.number_desc}</p>
                    <a className="contact-info__link" href={`tel:${(contact.number ?? '').replace(/[^\d+]/g, '')}`}>
                      {contact.number}
                    </a>
                  </div>
                </div>

                <div className="contact-info">
                  <div className="contact-info__icon">
                    <i className="las la-map-marker-alt" aria-hidden="true" />
                  </div>
                  <div className="contact-info__content">
                    <h6 className="contact-info__title">{contact.address_title ?? 'Find Us'}</h6>
                    <p className="contact-info__desc">{contact.address_desc}</p>
                    <span className="contact-info__link">{contact.address}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="checkout-card">
                <h5 className="checkout-card__title">{contact.heading ?? 'Connect With Our Experts'}</h5>
                <p>{contact.subheading}</p>

                {ticket && (
                  <div className="alert alert-success mt-3">
                    Thank you — your reference is <strong>{ticket}</strong>. We will reply by e-mail.
                  </div>
                )}

                <form className="mt-3" onSubmit={submit}>
                  <div className="row gy-3">
                    <div className="col-sm-6">
                      <label className="form--label">Your name</label>
                      <input className="form-control form--control" required value={form.name} onChange={update('name')} />
                    </div>
                    <div className="col-sm-6">
                      <label className="form--label">E-mail</label>
                      <input className="form-control form--control" type="email" required value={form.email} onChange={update('email')} />
                    </div>
                    <div className="col-12">
                      <label className="form--label">{t('Subject')}</label>
                      <input className="form-control form--control" required value={form.subject} onChange={update('subject')} />
                    </div>
                    <div className="col-12">
                      <label className="form--label">{t('Message')}</label>
                      <textarea className="form-control form--control" rows={5} required value={form.message} onChange={update('message')} />
                    </div>
                    {captcha.field && <div className="col-12">{captcha.field}</div>}
                    <div className="col-12">
                      <button className="btn btn--base" type="submit" disabled={busy}>
                        {busy ? 'Sending…' : 'Send message'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {mapLink && (
                <div className="contact-map-card mt-4">
                  <iframe
                    src={mapLink}
                    width="100%"
                    height="360"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="VIPURI location"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
