'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { useAdmin } from '@/components/admin/AdminProviders';
import { useCaptcha, useCaptchaConfig } from '@/components/ui/CaptchaField';
import { ApiError, apiWithMessage } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import type { StaffMember } from '@/types';

/** Staff sign-in. */
export function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const { setSession } = useAdmin();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const captcha = useCaptcha(useCaptchaConfig());

  const redirect = params.get('redirect') ?? '/admin';

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      const { data, message } = await apiWithMessage<{ admin: StaffMember; token: string }>('/admin/auth/login', {
        method: 'POST',
        body: { username, password, ...captcha.answer() },
      });

      setSession(data.token, data.admin);
      toastSuccess(message);
      router.push(redirect);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Login failed');
      captcha.reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <img className="admin-login__logo" src="/assets/images/logo_icon/logo.svg" alt="VIPURI" />
        <h4 className="admin-login__title">Staff sign in</h4>
        <p className="admin-login__subtitle">VIPURI administration</p>

        <form onSubmit={submit}>
          <div className="form-group mb-3">
            <label className="form-label">Username or e-mail</label>
            <input
              className="form-control"
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="form-group mb-3">
            <label className="form-label">Password</label>
            <input
              className="form-control"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {captcha.field}
          <button className="btn btn--primary w-100" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center mt-3 mb-0">
          <Link href="/admin/forgot-password">Forgot your password?</Link>
        </p>
      </div>
    </div>
  );
}

/** Staff password recovery: request a code, verify it, set a new password. */
export function AdminForgotPassword() {
  const [stage, setStage] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <img className="admin-login__logo" src="/assets/images/logo_icon/logo.svg" alt="VIPURI" />
        <h4 className="admin-login__title">Reset your password</h4>
        <p className="admin-login__subtitle">
          {stage === 'email' && 'We will e-mail you a six-digit code.'}
          {stage === 'code' && 'Enter the code we sent you.'}
          {stage === 'password' && 'Choose a new password.'}
        </p>

        {stage === 'email' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const { message } = await apiWithMessage('/admin/auth/forgot-password', {
                  method: 'POST',
                  body: { email },
                });
                toastSuccess(message);
                setStage('code');
              });
            }}
          >
            <div className="form-group mb-3">
              <label className="form-label">Staff e-mail</label>
              <input
                className="form-control"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <button className="btn btn--primary w-100" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        )}

        {stage === 'code' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const { data } = await apiWithMessage<{ token: string }>('/admin/auth/verify-reset-code', {
                  method: 'POST',
                  body: { email, code },
                });
                setToken(data.token);
                setStage('password');
              });
            }}
          >
            <div className="form-group mb-3">
              <label className="form-label">Reset code</label>
              <input
                className="form-control"
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <button className="btn btn--primary w-100" type="submit" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify code'}
            </button>
          </form>
        )}

        {stage === 'password' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();

              if (password !== confirmation) {
                toastError('The passwords do not match');
                return;
              }

              void run(async () => {
                const { message } = await apiWithMessage('/admin/auth/reset-password', {
                  method: 'POST',
                  body: { email, token, password, password_confirmation: confirmation },
                });
                toastSuccess(message);
                router.push('/admin/login');
              });
            }}
          >
            <div className="form-group mb-3">
              <label className="form-label">New password</label>
              <input
                className="form-control"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Confirm password</label>
              <input
                className="form-control"
                type="password"
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            <button className="btn btn--primary w-100" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="text-center mt-3 mb-0">
          <Link href="/admin/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
