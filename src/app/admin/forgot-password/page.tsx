import { Suspense } from 'react';

import { AdminForgotPassword } from '@/components/admin/AdminAuth';

export const metadata = { title: 'Reset password' };

export default function AdminForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <AdminForgotPassword />
    </Suspense>
  );
}
