import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ForgotPasswordForm } from '@/components/auth/AuthForms';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata: Metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <>
      <Breadcrumb title="Account Recovery" />
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </>
  );
}
