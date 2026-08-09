import { Suspense } from 'react';

import { InventoryScreen } from '@/components/admin/screens/Inventory';

export const metadata = { title: 'Branch inventory' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ branch_id?: string }>;
}) {
  const { branch_id: branchId } = await searchParams;

  return (
    <Suspense fallback={null}>
      <InventoryScreen initialBranchId={branchId} />
    </Suspense>
  );
}
