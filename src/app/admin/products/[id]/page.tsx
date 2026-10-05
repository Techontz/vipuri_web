import { ProductFormScreen } from '@/components/admin/screens/Catalog';

export const metadata = { title: 'Edit product' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductFormScreen productId={Number(id)} />;
}
