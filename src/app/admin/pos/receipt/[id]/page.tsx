import { PosReceiptScreen } from '@/components/admin/screens/Pos';

export const metadata = { title: 'Receipt' };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const { print } = await searchParams;

  return <PosReceiptScreen id={Number(id)} autoPrint={print === '1'} />;
}
