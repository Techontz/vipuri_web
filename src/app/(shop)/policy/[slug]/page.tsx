import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { serverGet } from '@/lib/server';

type Payload = { policy: { slug: string; title: string; details: string } };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await serverGet<Payload>(`/policy/${slug}`, 600);

  return { title: data?.policy.title ?? 'Policy' };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await serverGet<Payload>(`/policy/${slug}`, 600);

  if (!data) notFound();

  return (
    <>
      <Breadcrumb title={data.policy.title} />

      <section className="policy my-120">
        <div className="container">
          <div className="policy-data" dangerouslySetInnerHTML={{ __html: data.policy.details }} />
        </div>
      </section>
    </>
  );
}
