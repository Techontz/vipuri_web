'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AccountShell } from '@/components/auth/AccountShell';
import { useTranslate } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useSettings } from '@/components/providers/AppProviders';
import { useCaptcha } from '@/components/ui/CaptchaField';
import { ApiError, apiWithMessage } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import type { Customer } from '@/types';

/** Password field with the theme's show/hide toggle. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="col-sm-12 form-group">
      <label htmlFor={id} className="form--label">
        {label}
      </label>
      <div className="input-group input--group input--group-password">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="form-control form--control"
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="input-group-text input-group-btn"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <i className={visible ? 'far fa-eye' : 'far fa-eye-slash'} />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------- Login --------------------------------- */

export function LoginForm() {
  const t = useTranslate();
  const router = useRouter();
  const params = useSearchParams();
  const settings = useSettings();
  const { setSession } = useAuth();
  const { refresh, refreshWishlist } = useCart();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const captcha = useCaptcha(settings?.captcha);

  const redirect = params.get('redirect') ?? '/user/dashboard';

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const { data, message } = await apiWithMessage<{ user: Customer; token: string }>('/auth/login', {
        method: 'POST',
        cart: true,
        body: { username, password, ...captcha.answer() },
      });

      setSession(data.token, data.user);
      toastSuccess(message);

      await Promise.all([refresh(), refreshWishlist()]);
      router.push(redirect);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Login failed');
      captcha.reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountShell
      section="login"
      heading="Account Login"
      footer={
        settings?.site.registration_enabled ? (
          <p className="account-info">
            Don&apos;t have an account? <Link href="/register">{t('Register')}</Link>
          </p>
        ) : null
      }
    >
      <form className="account-form" onSubmit={submit}>
        <div className="row">
          <div className="col-sm-12 form-group">
            <label className="form--label">Username or e-mail</label>
            <input
              className="form-control form--control"
              type="text"
              name="username"
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <PasswordField id="password" label="Password" value={password} onChange={setPassword} />

          {captcha.field && <div className="col-sm-12">{captcha.field}</div>}

          <div className="col-sm-12 form-group">
            <div className="account-form__extra">
              <div className="form--check gradient">
                <input className="form-check-input" type="checkbox" id="remember-me" />
                <label className="form-check-label" htmlFor="remember-me">
                  {t('Remember me')}
                </label>
              </div>
              <Link href="/forgot-password" className="account-form__forgot-link">
                {t('Forgot password?')}
              </Link>
            </div>
          </div>

          <div className="col-sm-12">
            <button type="submit" className="btn btn--base w-100" disabled={busy}>
              {busy ? 'Signing in…' : 'Login'}
            </button>
          </div>
        </div>
      </form>
    </AccountShell>
  );
}

/* -------------------------------- Register -------------------------------- */

export function RegisterForm() {
  const t = useTranslate();
  const router = useRouter();
  const settings = useSettings();
  const { setSession } = useAuth();
  const { refresh, refreshWishlist } = useCart();

  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    dial_code: '+255',
    mobile: '',
    password: '',
    password_confirmation: '',
    agree: false,
  });
  const [busy, setBusy] = useState(false);
  const captcha = useCaptcha(settings?.captcha);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  if (settings && !settings.site.registration_enabled) {
    return (
      <AccountShell section="register" heading="Registration is closed">
        <p>
          New account registration is currently disabled. Please{' '}
          <Link href="/contact" className="text--base">
            contact VIPURI
          </Link>{' '}
          if you need an account.
        </p>
      </AccountShell>
    );
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.password !== form.password_confirmation) {
      toastError('The passwords do not match');
      return;
    }

    setBusy(true);

    try {
      const { data, message } = await apiWithMessage<{ user: Customer; token: string }>('/auth/register', {
        method: 'POST',
        cart: true,
        body: { ...form, ...captcha.answer() },
      });

      setSession(data.token, data.user);
      toastSuccess(message);

      await Promise.all([refresh(), refreshWishlist()]);
      router.push('/user/dashboard');
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Registration failed');
      captcha.reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountShell
      section="register"
      heading="Create Your Account"
      footer={
        <p className="account-info">
          Already registered? <Link href="/login">{t('Login')}</Link>
        </p>
      }
    >
      <form className="account-form" onSubmit={submit}>
        <div className="row">
          <div className="col-sm-6 form-group">
            <label className="form--label">{t('First name')}</label>
            <input className="form-control form--control" required value={form.firstname} onChange={update('firstname')} />
          </div>
          <div className="col-sm-6 form-group">
            <label className="form--label">{t('Last name')}</label>
            <input className="form-control form--control" required value={form.lastname} onChange={update('lastname')} />
          </div>
          <div className="col-sm-12 form-group">
            <label className="form--label">{t('Username')}</label>
            <input
              className="form-control form--control"
              required
              minLength={3}
              autoComplete="username"
              value={form.username}
              onChange={update('username')}
            />
          </div>
          <div className="col-sm-12 form-group">
            <label className="form--label">E-mail</label>
            <input
              className="form-control form--control"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
            />
          </div>
          <div className="col-sm-12 form-group">
            <label className="form--label">{t('Mobile')}</label>
            <div className="input-group input--group">
              <span className="input-group-text">{form.dial_code}</span>
              <input className="form-control form--control" value={form.mobile} onChange={update('mobile')} />
            </div>
          </div>

          <PasswordField
            id="reg-password"
            label="Password"
            value={form.password}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
            autoComplete="new-password"
          />
          <PasswordField
            id="reg-password-confirm"
            label="Confirm password"
            value={form.password_confirmation}
            onChange={(value) => setForm((current) => ({ ...current, password_confirmation: value }))}
            autoComplete="new-password"
          />

          <div className="col-sm-12 form-group">
            <div className="form--check">
              <input
                className="form-check-input"
                type="checkbox"
                id="agree"
                checked={form.agree}
                onChange={(event) => setForm((current) => ({ ...current, agree: event.target.checked }))}
                required
              />
              <label className="form-check-label" htmlFor="agree">
                I agree to the VIPURI terms of service and privacy policy
              </label>
            </div>
          </div>

          {captcha.field && <div className="col-sm-12">{captcha.field}</div>}

          <div className="col-sm-12">
            <button type="submit" className="btn btn--base w-100" disabled={busy}>
              {busy ? 'Creating your account…' : 'Register'}
            </button>
          </div>
        </div>
      </form>
    </AccountShell>
  );
}

/* ----------------------------- Password reset ----------------------------- */

export function ForgotPasswordForm() {
  const t = useTranslate();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const settings = useSettings();
  const captcha = useCaptcha(settings?.captcha);

  const requestCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const { message } = await apiWithMessage('/auth/forgot-password', {
        method: 'POST',
        body: { email, ...captcha.answer() },
      });
      toastSuccess(message);
      setStage('code');
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not send the reset code');
      captcha.reset();
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const { data } = await apiWithMessage<{ token: string }>('/auth/verify-reset-code', {
        method: 'POST',
        body: { email, code },
      });

      router.push(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(data.token)}`);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'That code is not valid');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountShell
      section="login"
      heading="Reset your password"
      description={
        stage === 'email'
          ? 'Enter your e-mail and we will send you a six-digit reset code.'
          : 'Enter the six-digit code we sent to your e-mail.'
      }
      footer={
        <p className="account-info">
          Remembered it? <Link href="/login">{t('Login')}</Link>
        </p>
      }
    >
      {stage === 'email' ? (
        <form className="account-form" onSubmit={requestCode}>
          <div className="row">
            <div className="col-sm-12 form-group">
              <label className="form--label">E-mail</label>
              <input
                className="form-control form--control"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {captcha.field && <div className="col-sm-12">{captcha.field}</div>}
            <div className="col-sm-12">
              <button className="btn btn--base w-100" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset code'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <form className="account-form" onSubmit={verifyCode}>
          <div className="row">
            <div className="col-sm-12 form-group">
              <label className="form--label">Reset code</label>
              <input
                className="form-control form--control"
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <div className="col-sm-12">
              <button className="btn btn--base w-100" type="submit" disabled={busy}>
                {busy ? 'Verifying…' : 'Verify code'}
              </button>
              <button className="btn btn-outline--base w-100 mt-2" type="button" onClick={() => setStage('email')}>
                Use a different e-mail
              </button>
            </div>
          </div>
        </form>
      )}
    </AccountShell>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();

  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmation) {
      toastError('The passwords do not match');
      return;
    }

    setBusy(true);

    try {
      const { message } = await apiWithMessage('/auth/reset-password', {
        method: 'POST',
        body: { email, token, password, password_confirmation: confirmation },
      });

      toastSuccess(message);
      router.push('/login');
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not reset your password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountShell section="login" heading="Choose a new password" description={`Resetting the password for ${email}`}>
      <form className="account-form" onSubmit={submit}>
        <div className="row">
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-password"
            label="Confirm password"
            value={confirmation}
            onChange={setConfirmation}
            autoComplete="new-password"
          />
          <div className="col-sm-12">
            <button className="btn btn--base w-100" type="submit" disabled={busy || !token}>
              {busy ? 'Saving…' : 'Reset password'}
            </button>
          </div>
        </div>
      </form>
    </AccountShell>
  );
}
