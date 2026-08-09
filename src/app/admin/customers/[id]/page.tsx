import { CustomerDetailScreen } from '@/components/admin/screens/Sales';

export const metadata = { title: 'Customer detail' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailScreen id={Number(id)} />;
}
