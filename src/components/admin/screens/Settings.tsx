'use client';

import { useCallback, useEffect, useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminShell';
import { useAdmin } from '@/components/admin/AdminProviders';
import { Card, DataTable, Field, Modal, StatusBadge } from '@/components/admin/ui';
import { ApiError, api, apiWithMessage } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';

/* ============================== General settings ========================== */

type GeneralSettings = Record<string, string | number | boolean | null>;

export function GeneralSettingsScreen() {
  const [settings, setSettings] = useState<GeneralSettings>({});
  const [logos, setLogos] = useState<{ logo: string | null; logo_dark: string | null; favicon: string | null }>({
    logo: null,
    logo_dark: null,
    favicon: null,
  });
  const [files, setFiles] = useState<{ logo?: File; logo_dark?: File; favicon?: File }>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ settings: GeneralSettings; logo: string | null; logo_dark: string | null; favicon: string | null }>(
        '/admin/settings/general',
        { auth: 'admin' },
      );
      setSettings(data.settings ?? {});
      setLogos({ logo: data.logo, logo_dark: data.logo_dark, favicon: data.favicon });
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (key: string, value: string | boolean | number) => setSettings((current) => ({ ...current, [key]: value }));

  if (loading) return <div className="vp-skeleton" style={{ height: 300 }} />;

  const toggles: [string, string][] = [
    ['registration', 'Allow customer registration'],
    ['ev', 'Require e-mail verification'],
    ['sv', 'Require SMS verification'],
    ['en', 'Send e-mail notifications'],
    ['sn', 'Send SMS notifications'],
    ['has_cod', 'Offer cash on delivery'],
    ['secure_password', 'Enforce strong passwords'],
    ['multi_language', 'Multi-language'],
    ['force_ssl', 'Force HTTPS'],
  ];

  return (
    <>
      <AdminPageHeader title="General settings" />

      <div className="row gy-4">
        <div className="col-lg-8">
          <Card title="Store">
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);

                try {
                  const { message } = await apiWithMessage('/admin/settings/general', {
                    method: 'POST',
                    auth: 'admin',
                    body: settings,
                  });
                  toastSuccess(message);
                  await load();
                } catch (error) {
                  toastError(error instanceof ApiError ? error.message : 'Could not save settings');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="row">
                <Field label="Site name" required>
                  <input className="form-control" required value={String(settings.site_name ?? '')} onChange={(event) => set('site_name', event.target.value)} />
                </Field>
                <Field label="Order number prefix">
                  <input className="form-control" value={String(settings.order_number_prefix ?? '')} onChange={(event) => set('order_number_prefix', event.target.value)} />
                </Field>
                <Field label="Currency code" required>
                  <input className="form-control" required value={String(settings.cur_text ?? '')} onChange={(event) => set('cur_text', event.target.value)} />
                </Field>
                <Field label="Currency symbol" required>
                  <input className="form-control" required value={String(settings.cur_sym ?? '')} onChange={(event) => set('cur_sym', event.target.value)} />
                </Field>
                <Field label="Base colour" hint="Hex without the #, e.g. FF7A00">
                  <input className="form-control" value={String(settings.base_color ?? '')} onChange={(event) => set('base_color', event.target.value)} />
                </Field>
                <Field label="Secondary colour">
                  <input className="form-control" value={String(settings.secondary_color ?? '')} onChange={(event) => set('secondary_color', event.target.value)} />
                </Field>
                <Field label="Products per page">
                  <input className="form-control" type="number" min="1" max="100" value={String(settings.paginate_number ?? 12)} onChange={(event) => set('paginate_number', Number(event.target.value))} />
                </Field>
              </div>

              <h6 className="mt-3">Behaviour</h6>
              <div className="permission-grid">
                {toggles.map(([key, label]) => (
                  <div className="form-check" key={key}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`setting-${key}`}
                      checked={Boolean(settings[key])}
                      onChange={(event) => set(key, event.target.checked)}
                    />
                    <label className="form-check-label" htmlFor={`setting-${key}`}>
                      {label}
                    </label>
                  </div>
                ))}
              </div>

              <button className="btn btn--primary mt-4" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save settings'}
              </button>
            </form>
          </Card>
        </div>

        <div className="col-lg-4">
          <Card title="Branding">
            <form
              onSubmit={async (event) => {
                event.preventDefault();

                try {
                  const body = new FormData();
                  if (files.logo) body.append('logo', files.logo);
                  if (files.logo_dark) body.append('logo_dark', files.logo_dark);
                  if (files.favicon) body.append('favicon', files.favicon);

                  const { message } = await apiWithMessage('/admin/settings/logo', { method: 'POST', auth: 'admin', body });
                  toastSuccess(message);
                  setFiles({});
                  await load();
                } catch (error) {
                  toastError(error instanceof ApiError ? error.message : 'Could not save branding');
                }
              }}
            >
              {(
                [
                  ['logo', 'Logo (light background)'],
                  ['logo_dark', 'Logo (dark background)'],
                  ['favicon', 'Favicon'],
                ] as const
              ).map(([key, label]) => (
                <div className="form-group mb-3" key={key}>
                  <label className="form-label">{label}</label>
                  {logos[key] && <img src={logos[key] as string} alt={label} style={{ maxWidth: 160, display: 'block', marginBottom: 8 }} />}
                  <input
                    className="form-control"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setFiles((current) => ({ ...current, [key]: event.target.files?.[0] }))}
                  />
                </div>
              ))}

              <button className="btn btn--primary" type="submit">
                Upload branding
              </button>
            </form>
          </Card>

          <Card title="Maintenance mode" className="mt-4">
            <p>Take the storefront offline while keeping the admin panel available.</p>
            <button
              className={`btn ${settings.maintenance_mode ? 'btn--success' : 'btn--warning'}`}
              type="button"
              onClick={async () => {
                try {
                  const { message } = await apiWithMessage('/admin/settings/maintenance-mode', {
                    method: 'POST',
                    auth: 'admin',
                    body: { maintenance_mode: !settings.maintenance_mode },
                  });
                  toastSuccess(message);
                  await load();
                } catch (error) {
                  toastError(error instanceof ApiError ? error.message : 'Could not change maintenance mode');
                }
              }}
            >
              {settings.maintenance_mode ? 'Bring the store back online' : 'Enable maintenance mode'}
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ============================== Company profile =========================== */

export function CompanySettingsScreen() {
  const [company, setCompany] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ company: Record<string, string> }>('/admin/settings/company', { auth: 'admin' })
      .then((data) => setCompany(data.company ?? {}))
      .catch((error) => toastError(error instanceof ApiError ? error.message : 'Could not load the company profile'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setCompany((current) => ({ ...current, [key]: event.target.value }));

  if (loading) return <div className="vp-skeleton" style={{ height: 300 }} />;

  return (
    <>
      <AdminPageHeader title="Company profile" />

      <Card>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);

            try {
              const body = new FormData();
              Object.entries(company).forEach(([key, value]) => {
                if (['id', 'created_at', 'updated_at', 'slug', 'status', 'logo'].includes(key)) return;
                body.append(key, value ?? '');
              });
              if (logo) body.append('logo', logo);

              const { message } = await apiWithMessage('/admin/settings/company', { method: 'POST', auth: 'admin', body });
              toastSuccess(message);
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : 'Could not save the profile');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="row">
            <Field label="Trading name" required>
              <input className="form-control" required value={company.name ?? ''} onChange={set('name')} />
            </Field>
            <Field label="Legal name">
              <input className="form-control" value={company.legal_name ?? ''} onChange={set('legal_name')} />
            </Field>
            <Field label="E-mail">
              <input className="form-control" type="email" value={company.email ?? ''} onChange={set('email')} />
            </Field>
            <Field label="Phone">
              <input className="form-control" value={company.phone ?? ''} onChange={set('phone')} />
            </Field>
            <Field label="TIN">
              <input className="form-control" value={company.tin ?? ''} onChange={set('tin')} />
            </Field>
            <Field label="VAT registration number">
              <input className="form-control" value={company.vrn ?? ''} onChange={set('vrn')} />
            </Field>
            <Field label="Address" className="col-12">
              <input className="form-control" value={company.address ?? ''} onChange={set('address')} />
            </Field>
            <Field label="City">
              <input className="form-control" value={company.city ?? ''} onChange={set('city')} />
            </Field>
            <Field label="Region">
              <input className="form-control" value={company.region ?? ''} onChange={set('region')} />
            </Field>
            <Field label="Logo" className="col-12">
              <input className="form-control" type="file" accept="image/*" onChange={(event) => setLogo(event.target.files?.[0] ?? null)} />
            </Field>
          </div>

          <button className="btn btn--primary mt-3" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save company profile'}
          </button>
        </form>
      </Card>
    </>
  );
}

/* ================================ AI settings ============================= */

export function AiSettingsScreen() {
  const [data, setData] = useState<{
    default_engine: number;
    openai_api_model: string | null;
    ai_review_summary: boolean;
    ai_product_chat: boolean;
    openai_key_set: boolean;
    gemini_key_set: boolean;
    engines: { value: number; label: string }[];
  } | null>(null);
  const [keys, setKeys] = useState({ openai_api_key: '', gemini_api_key: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<NonNullable<typeof data>>('/admin/settings/ai', { auth: 'admin' }));
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load AI settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !data) return <div className="vp-skeleton" style={{ height: 260 }} />;

  return (
    <>
      <AdminPageHeader title="AI configuration" />

      <Card>
        <p>
          VIPURI uses AI for product copy generation in the admin, review summaries and the product chat on the
          storefront. Keys can live here or in the backend <code>.env</code>; a key entered here takes precedence and is
          never shown again.
        </p>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);

            try {
              const { message } = await apiWithMessage('/admin/settings/ai', {
                method: 'POST',
                auth: 'admin',
                body: {
                  default_engine: data.default_engine,
                  openai_api_model: data.openai_api_model,
                  ai_review_summary: data.ai_review_summary,
                  ai_product_chat: data.ai_product_chat,
                  openai_api_key: keys.openai_api_key || undefined,
                  gemini_api_key: keys.gemini_api_key || undefined,
                },
              });

              toastSuccess(message);
              setKeys({ openai_api_key: '', gemini_api_key: '' });
              await load();
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : 'Could not save AI settings');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="row">
            <Field label="Default engine" required>
              <select
                className="form-select"
                value={data.default_engine}
                onChange={(event) => setData({ ...data, default_engine: Number(event.target.value) })}
              >
                {data.engines.map((engine) => (
                  <option value={engine.value} key={engine.value}>
                    {engine.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="OpenAI model">
              <input
                className="form-control"
                value={data.openai_api_model ?? ''}
                onChange={(event) => setData({ ...data, openai_api_model: event.target.value })}
              />
            </Field>
            <Field label={`OpenAI API key ${data.openai_key_set ? '(configured)' : '(not set)'}`}>
              <input
                className="form-control"
                type="password"
                placeholder={data.openai_key_set ? '•••••••• leave blank to keep' : 'sk-…'}
                value={keys.openai_api_key}
                onChange={(event) => setKeys((c) => ({ ...c, openai_api_key: event.target.value }))}
              />
            </Field>
            <Field label={`Gemini API key ${data.gemini_key_set ? '(configured)' : '(not set)'}`}>
              <input
                className="form-control"
                type="password"
                placeholder={data.gemini_key_set ? '•••••••• leave blank to keep' : 'AIza…'}
                value={keys.gemini_api_key}
                onChange={(event) => setKeys((c) => ({ ...c, gemini_api_key: event.target.value }))}
              />
            </Field>

            <div className="col-12 d-flex gap-4 mt-2">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="ai-summary"
                  checked={data.ai_review_summary}
                  onChange={(event) => setData({ ...data, ai_review_summary: event.target.checked })}
                />
                <label className="form-check-label" htmlFor="ai-summary">
                  AI review summaries on product pages
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="ai-chat"
                  checked={data.ai_product_chat}
                  onChange={(event) => setData({ ...data, ai_product_chat: event.target.checked })}
                />
                <label className="form-check-label" htmlFor="ai-chat">
                  AI product chat on product pages
                </label>
              </div>
            </div>
          </div>

          <button className="btn btn--primary mt-4" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save AI settings'}
          </button>
        </form>
      </Card>
    </>
  );
}

/* ========================== Notification templates ======================== */

type Template = {
  id: number;
  act: string;
  name: string;
  subject: string | null;
  email_body: string | null;
  sms_body: string | null;
  push_body: string | null;
  shortcodes: Record<string, string> | null;
  email_status: boolean;
  sms_status: boolean;
  push_status: boolean;
};

export function NotificationTemplatesScreen() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ templates: Template[] }>('/admin/settings/notification-templates', { auth: 'admin' });
      setTemplates(data.templates ?? []);
      setSelected((current) => data.templates?.find((template) => template.id === current?.id) ?? data.templates?.[0] ?? null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <div className="vp-skeleton" style={{ height: 300 }} />;

  return (
    <>
      <AdminPageHeader title="Notification templates" />

      <div className="row gy-4">
        <div className="col-lg-4">
          <Card title="Templates">
            <ul className="list-group list-group-flush">
              {templates.map((template) => (
                <li className="list-group-item px-0" key={template.id}>
                  <button
                    className={`btn w-100 text-start ${selected?.id === template.id ? 'btn--primary' : 'btn-outline--primary'}`}
                    type="button"
                    onClick={() => setSelected(template)}
                  >
                    {template.name}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="col-lg-8">
          {selected && (
            <Card title={selected.name}>
              {selected.shortcodes && (
                <p style={{ fontSize: 13 }}>
                  Available placeholders:{' '}
                  {Object.keys(selected.shortcodes).map((code) => (
                    <code className="me-2" key={code}>{`{{${code}}}`}</code>
                  ))}
                </p>
              )}

              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);

                  try {
                    const { message } = await apiWithMessage(`/admin/settings/notification-templates/${selected.id}`, {
                      method: 'POST',
                      auth: 'admin',
                      body: {
                        subject: selected.subject,
                        email_body: selected.email_body,
                        sms_body: selected.sms_body,
                        push_body: selected.push_body,
                        email_status: selected.email_status,
                        sms_status: selected.sms_status,
                        push_status: selected.push_status,
                      },
                    });

                    toastSuccess(message);
                    await load();
                  } catch (error) {
                    toastError(error instanceof ApiError ? error.message : 'Could not save the template');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Field label="Subject" className="col-12">
                  <input className="form-control" value={selected.subject ?? ''} onChange={(event) => setSelected({ ...selected, subject: event.target.value })} />
                </Field>
                <Field label="E-mail body" className="col-12" hint="HTML is allowed.">
                  <textarea className="form-control" rows={8} value={selected.email_body ?? ''} onChange={(event) => setSelected({ ...selected, email_body: event.target.value })} />
                </Field>
                <Field label="SMS body" className="col-12">
                  <textarea className="form-control" rows={3} value={selected.sms_body ?? ''} onChange={(event) => setSelected({ ...selected, sms_body: event.target.value })} />
                </Field>

                <div className="d-flex gap-4 mt-2">
                  {(
                    [
                      ['email_status', 'Send by e-mail'],
                      ['sms_status', 'Send by SMS'],
                      ['push_status', 'Send as push'],
                    ] as const
                  ).map(([key, label]) => (
                    <div className="form-check" key={key}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`tpl-${key}`}
                        checked={Boolean(selected[key])}
                        onChange={(event) => setSelected({ ...selected, [key]: event.target.checked })}
                      />
                      <label className="form-check-label" htmlFor={`tpl-${key}`}>
                        {label}
                      </label>
                    </div>
                  ))}
                </div>

                <button className="btn btn--primary mt-4" type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save template'}
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

/* =============================== System info ============================== */

export function SystemInfoScreen() {
  const [info, setInfo] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Record<string, string | boolean>>('/admin/settings/system-info', { auth: 'admin' })
      .then(setInfo)
      .catch((error) => toastError(error instanceof ApiError ? error.message : 'Could not load system info'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="vp-skeleton" style={{ height: 240 }} />;

  return (
    <>
      <AdminPageHeader title="System information" />

      <div className="row gy-4">
        <div className="col-lg-8">
          <Card>
            <ul className="list-group list-group-flush">
              {Object.entries(info).map(([key, value]) => (
                <li className="list-group-item d-flex justify-content-between px-0" key={key}>
                  <span className="text-capitalize">{key.replace(/_/g, ' ')}</span>
                  <strong>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</strong>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="col-lg-4">
          <Card title="Maintenance">
            <p>Clear the application cache after changing settings or content directly in the database.</p>
            <button
              className="btn btn--primary"
              type="button"
              onClick={async () => {
                try {
                  const { message } = await apiWithMessage('/admin/settings/clear-cache', { method: 'POST', auth: 'admin' });
                  toastSuccess(message);
                } catch (error) {
                  toastError(error instanceof ApiError ? error.message : 'Could not clear the cache');
                }
              }}
            >
              Clear cache
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ============================== Admin profile ============================= */

export function AdminProfileScreen() {
  const { admin, refresh } = useAdmin();
  const [form, setForm] = useState({ name: '', email: '', dial_code: '+255', mobile: '' });
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!admin) return;

    setForm({
      name: admin.name,
      email: admin.email,
      dial_code: admin.dial_code ?? '+255',
      mobile: admin.mobile ?? '',
    });
  }, [admin]);

  return (
    <>
      <AdminPageHeader title="My profile" />

      <div className="row gy-4">
        <div className="col-lg-8">
          <Card>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);

                try {
                  const body = new FormData();
                  Object.entries(form).forEach(([key, value]) => body.append(key, value));
                  if (image) body.append('image', image);

                  const { message } = await apiWithMessage('/admin/auth/profile', { method: 'POST', auth: 'admin', body });
                  toastSuccess(message);
                  await refresh();
                } catch (error) {
                  toastError(error instanceof ApiError ? error.message : 'Could not save your profile');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="row">
                <Field label="Name" required>
                  <input className="form-control" required value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
                </Field>
                <Field label="E-mail" required>
                  <input className="form-control" type="email" required value={form.email} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} />
                </Field>
                <Field label="Mobile">
                  <input className="form-control" value={form.mobile} onChange={(event) => setForm((c) => ({ ...c, mobile: event.target.value }))} />
                </Field>
                <Field label="Photo">
                  <input className="form-control" type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] ?? null)} />
                </Field>
              </div>

              <button className="btn btn--primary mt-3" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          </Card>
        </div>

        <div className="col-lg-4">
          <Card title="Access">
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Role</span> <strong>{admin?.role}</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Branch</span> <strong>{admin?.branch?.name ?? 'All branches'}</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between px-0">
                <span>Permissions</span> <strong>{admin?.permissions.length ?? 0}</strong>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

export function AdminChangePasswordScreen() {
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [busy, setBusy] = useState(false);

  return (
    <>
      <AdminPageHeader title="Change password" />

      <Card>
        <form
          onSubmit={async (event) => {
            event.preventDefault();

            if (form.password !== form.password_confirmation) {
              toastError('The passwords do not match');
              return;
            }

            setBusy(true);

            try {
              const { message } = await apiWithMessage('/admin/auth/change-password', {
                method: 'POST',
                auth: 'admin',
                body: form,
              });
              toastSuccess(message);
              setForm({ current_password: '', password: '', password_confirmation: '' });
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : 'Could not change your password');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="row">
            <Field label="Current password" required className="col-12">
              <input className="form-control" type="password" required value={form.current_password} onChange={(event) => setForm((c) => ({ ...c, current_password: event.target.value }))} />
            </Field>
            <Field label="New password" required>
              <input className="form-control" type="password" required value={form.password} onChange={(event) => setForm((c) => ({ ...c, password: event.target.value }))} />
            </Field>
            <Field label="Confirm new password" required>
              <input className="form-control" type="password" required value={form.password_confirmation} onChange={(event) => setForm((c) => ({ ...c, password_confirmation: event.target.value }))} />
            </Field>
          </div>

          <button className="btn btn--primary mt-3" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </Card>
    </>
  );
}

/* ================================ Extensions ============================== */

type ExtensionField = {
  name: string;
  title: string;
  value: string;
  is_secret: boolean;
  is_set: boolean;
};

type ExtensionRow = {
  id: number;
  act: string;
  name: string;
  description: string | null;
  status: boolean;
  fields: ExtensionField[];
};

/**
 * Third-party integrations: captchas, analytics, live chat and comments.
 *
 * Each is off until every field is filled in, so the storefront never shows a
 * widget that cannot load. Secrets are write-only — the form reports whether
 * one is on file but never displays it.
 */
export function ExtensionsScreen() {
  const [extensions, setExtensions] = useState<ExtensionRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Record<string, string>>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ extensions: ExtensionRow[] }>('/admin/extensions', { auth: 'admin' });
      setExtensions(data.extensions);
      setDrafts({});
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load extensions');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (extension: ExtensionRow, status: boolean) => {
    setBusy(extension.id);

    const shortcode: Record<string, string> = {};

    for (const field of extension.fields) {
      const draft = drafts[extension.id]?.[field.name];
      shortcode[field.name] = draft ?? (field.is_secret ? '' : field.value);
    }

    try {
      const { message } = await apiWithMessage(`/admin/extensions/${extension.id}`, {
        method: 'POST',
        auth: 'admin',
        body: { shortcode, status },
      });

      toastSuccess(message);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not save the extension');
    } finally {
      setBusy(null);
    }
  };

  if (!extensions) return <div className="vp-skeleton" style={{ height: 320 }} />;

  return (
    <>
      <AdminPageHeader title="Extensions" />

      <div className="row">
        {extensions.map((extension) => (
          <div className="col-lg-6" key={extension.id}>
            <Card>
              <div className="vp-extension__head">
                <div>
                  <h6 className="mb-1">{extension.name}</h6>
                  <p className="text-muted mb-0">{extension.description}</p>
                </div>
                <span className={`badge ${extension.status ? 'bg--success' : 'bg--secondary'}`}>
                  {extension.status ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {extension.fields.map((field) => (
                <div className="form-group mt-3" key={field.name}>
                  <label className="form-label">
                    {field.title}
                    {field.is_secret && (
                      <span className="text-muted"> {field.is_set ? '(stored)' : '(not set)'}</span>
                    )}
                  </label>
                  <input
                    className="form-control"
                    type={field.is_secret ? 'password' : 'text'}
                    placeholder={field.is_secret && field.is_set ? '•••••••• leave blank to keep' : ''}
                    value={drafts[extension.id]?.[field.name] ?? (field.is_secret ? '' : field.value)}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [extension.id]: { ...current[extension.id], [field.name]: event.target.value },
                      }))
                    }
                  />
                </div>
              ))}

              <div className="vp-extension__actions">
                <button
                  className="btn btn--primary btn-sm"
                  type="button"
                  disabled={busy === extension.id}
                  onClick={() => void save(extension, extension.status)}
                >
                  Save
                </button>
                <button
                  className={`btn btn-sm ${extension.status ? 'btn--danger' : 'btn--success'}`}
                  type="button"
                  disabled={busy === extension.id}
                  onClick={() => void save(extension, !extension.status)}
                >
                  {extension.status ? 'Disable' : 'Enable'}
                </button>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </>
  );
}

/* =============================== Social login ============================= */

type SocialProvider = {
  provider: string;
  label: string;
  status: boolean;
  client_id: string;
  secret_set: boolean;
  callback_url: string;
};

/**
 * OAuth credentials for customer sign-in.
 *
 * A provider cannot be enabled without both a client ID and a secret, so the
 * storefront never offers a button that leads nowhere. Secrets are write-only.
 */
export function SocialLoginScreen() {
  const [providers, setProviders] = useState<SocialProvider[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { client_id?: string; client_secret?: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ providers: SocialProvider[] }>('/admin/settings/social-logins', { auth: 'admin' });
      setProviders(data.providers);
      setDrafts({});
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load social login settings');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (provider: SocialProvider, status: boolean) => {
    setBusy(provider.provider);

    try {
      const { message } = await apiWithMessage(`/admin/settings/social-logins/${provider.provider}`, {
        method: 'POST',
        auth: 'admin',
        body: {
          client_id: drafts[provider.provider]?.client_id ?? provider.client_id,
          client_secret: drafts[provider.provider]?.client_secret || undefined,
          status,
        },
      });

      toastSuccess(message);
      await load();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not save the provider');
    } finally {
      setBusy(null);
    }
  };

  if (!providers) return <div className="vp-skeleton" style={{ height: 320 }} />;

  return (
    <>
      <AdminPageHeader title="Social login" />

      <Card>
        <p>
          Let customers sign in with an existing account. Register VIPURI with each provider, then paste the
          credentials here — add the callback URL shown below to the provider&apos;s allowed redirect list.
        </p>
      </Card>

      <div className="row">
        {providers.map((provider) => (
          <div className="col-lg-6" key={provider.provider}>
            <Card>
              <div className="vp-extension__head">
                <h6 className="mb-0">{provider.label}</h6>
                <span className={`badge ${provider.status ? 'bg--success' : 'bg--secondary'}`}>
                  {provider.status ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Client ID</label>
                <input
                  className="form-control"
                  value={drafts[provider.provider]?.client_id ?? provider.client_id}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [provider.provider]: { ...current[provider.provider], client_id: event.target.value },
                    }))
                  }
                />
              </div>

              <div className="form-group mt-3">
                <label className="form-label">
                  Client secret
                  <span className="text-muted"> {provider.secret_set ? '(stored)' : '(not set)'}</span>
                </label>
                <input
                  className="form-control"
                  type="password"
                  placeholder={provider.secret_set ? '•••••••• leave blank to keep' : ''}
                  value={drafts[provider.provider]?.client_secret ?? ''}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [provider.provider]: { ...current[provider.provider], client_secret: event.target.value },
                    }))
                  }
                />
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Callback URL</label>
                <input className="form-control" readOnly value={provider.callback_url} />
              </div>

              <div className="vp-extension__actions">
                <button
                  className="btn btn--primary btn-sm"
                  type="button"
                  disabled={busy === provider.provider}
                  onClick={() => void save(provider, provider.status)}
                >
                  Save
                </button>
                <button
                  className={`btn btn-sm ${provider.status ? 'btn--danger' : 'btn--success'}`}
                  type="button"
                  disabled={busy === provider.provider}
                  onClick={() => void save(provider, !provider.status)}
                >
                  {provider.status ? 'Disable' : 'Enable'}
                </button>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </>
  );
}

/* ================================ Languages =============================== */

type LanguageRow = { id: number; name: string; code: string; is_default: boolean };

/**
 * Languages and their translation strings.
 *
 * Replaces the source system's per-language JSON files. Keys are the English
 * source text, so a string left blank simply renders in English on the
 * storefront rather than breaking.
 */
export function LanguagesScreen() {
  const [languages, setLanguages] = useState<LanguageRow[] | null>(null);
  const [editing, setEditing] = useState<LanguageRow | null>(null);
  const [strings, setStrings] = useState<Record<string, string>>({});
  const [keys, setKeys] = useState<string[]>([]);
  const [isSource, setIsSource] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ name: '', code: '' });

  const load = useCallback(async () => {
    try {
      const data = await api<{ languages: LanguageRow[] }>('/admin/languages', { auth: 'admin' });
      setLanguages(data.languages);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load languages');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEditor = async (language: LanguageRow) => {
    try {
      const data = await api<{ strings: Record<string, string>; keys: string[]; is_source: boolean }>(
        `/admin/languages/${language.id}/strings`,
        { auth: 'admin' },
      );

      setEditing(language);
      setStrings(data.strings ?? {});
      setKeys(data.keys ?? []);
      setIsSource(data.is_source);
      setSearch('');
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not load translations');
    }
  };

  const saveStrings = async () => {
    if (!editing) return;
    setBusy(true);

    try {
      const { message } = await apiWithMessage(`/admin/languages/${editing.id}/strings`, {
        method: 'POST',
        auth: 'admin',
        body: { strings },
      });

      toastSuccess(message);
      setEditing(null);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not save translations');
    } finally {
      setBusy(false);
    }
  };

  if (!languages) return <div className="vp-skeleton" style={{ height: 320 }} />;

  const visibleKeys = keys.filter((key) => key.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <AdminPageHeader title="Languages" />

      <Card>
        <form
          className="row align-items-end"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);

            try {
              const { message } = await apiWithMessage('/admin/languages', {
                method: 'POST',
                auth: 'admin',
                body: form,
              });

              toastSuccess(message);
              setForm({ name: '', code: '' });
              await load();
            } catch (error) {
              toastError(error instanceof ApiError ? error.message : 'Could not add the language');
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Language name" required>
            <input
              className="form-control"
              required
              value={form.name}
              onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
            />
          </Field>
          <Field label="Code" required>
            <input
              className="form-control"
              required
              placeholder="fr"
              value={form.code}
              onChange={(event) => setForm((c) => ({ ...c, code: event.target.value }))}
            />
          </Field>
          <div className="col-md-4 mb-3">
            <button className="btn btn--primary" type="submit" disabled={busy}>
              Add language
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <DataTable
          rows={languages}
          empty="No languages configured"
          rowKey={(row: LanguageRow) => row.id}
          columns={[
            { key: 'name', label: 'Name', render: (row: LanguageRow) => row.name },
            { key: 'code', label: 'Code', render: (row: LanguageRow) => row.code },
            {
              key: 'default',
              label: 'Default',
              render: (row: LanguageRow) =>
                row.is_default ? <StatusBadge active labels={['Default', '—']} /> : '—',
            },
            {
              key: 'actions',
              label: '',
              align: 'end',
              render: (row: LanguageRow) => (
                <div className="vp-extension__actions">
                  <button className="btn btn-sm btn--primary" type="button" onClick={() => void openEditor(row)}>
                    Translations
                  </button>
                  {!row.is_default && (
                    <button
                      className="btn btn-sm btn--danger"
                      type="button"
                      onClick={async () => {
                        try {
                          const { message } = await apiWithMessage(`/admin/languages/${row.id}`, {
                            method: 'DELETE',
                            auth: 'admin',
                          });
                          toastSuccess(message);
                          await load();
                        } catch (error) {
                          toastError(error instanceof ApiError ? error.message : 'Could not delete');
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={Boolean(editing)}
        title={editing ? `${editing.name} translations` : ''}
        onClose={() => setEditing(null)}
        size="lg"
      >
        {isSource ? (
          <p className="mb-0">
            {editing?.name} is the source language — its keys are the strings themselves, so there is nothing to
            translate here.
          </p>
        ) : (
          <>
            <input
              className="form-control mb-3"
              placeholder="Filter strings…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {visibleKeys.map((key) => (
                <div className="form-group mb-2" key={key}>
                  <label className="form-label">{key}</label>
                  <input
                    className="form-control"
                    placeholder={key}
                    value={strings[key] ?? ''}
                    onChange={(event) => setStrings((current) => ({ ...current, [key]: event.target.value }))}
                  />
                </div>
              ))}
              {visibleKeys.length === 0 && <p className="mb-0">No strings match that filter.</p>}
            </div>

            <button className="btn btn--primary mt-3" type="button" disabled={busy} onClick={() => void saveStrings()}>
              {busy ? 'Saving…' : 'Save translations'}
            </button>
          </>
        )}
      </Modal>
    </>
  );
}
