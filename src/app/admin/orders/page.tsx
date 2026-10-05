import { Suspense } from 'react';

import { OrdersScreen } from '@/components/admin/screens/Sales';

export const metadata = { title: 'Orders' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; branch_id?: string }>;
}) {
  const { status, branch_id: branchId } = await searchParams;

  return (
    <Suspense fallback={null}>
      <OrdersScreen initialStatus={status} initialBranchId={branchId} />
    </Suspense>
  );
}
