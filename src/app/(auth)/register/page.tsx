import type { Metadata } from 'next';
import { Suspense } from 'react';

import { RegisterForm } from '@/components/auth/AuthForms';

export const metadata: Metadata = { title: 'Create an account' };

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
