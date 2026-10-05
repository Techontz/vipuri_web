import { Suspense } from 'react';

import { AdminLogin } from '@/components/admin/AdminAuth';

export const metadata = { title: 'Sign in' };

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLogin />
    </Suspense>
  );
}
