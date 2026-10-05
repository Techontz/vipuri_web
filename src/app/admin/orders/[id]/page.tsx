import { OrderDetailScreen } from '@/components/admin/screens/Sales';

export const metadata = { title: 'Order detail' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailScreen id={Number(id)} />;
}
