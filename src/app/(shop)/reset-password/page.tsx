import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ResetPasswordForm } from '@/components/auth/AuthForms';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <>
      <Breadcrumb title="Account Recovery" />
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
