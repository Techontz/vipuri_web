import { BranchDetailScreen } from '@/components/admin/screens/Branches';

export const metadata = { title: 'Branch detail' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BranchDetailScreen id={Number(id)} />;
}
