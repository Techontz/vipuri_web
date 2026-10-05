import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CmsPageSections } from '@/components/site/CmsPageSections';
import { serverGet } from '@/lib/server';
import type { CmsBlock } from '@/types';

type Payload = {
  page: { name: string; slug: string; seo: Record<string, string> | null };
  sections: Record<string, CmsBlock | CmsBlock[]>;
  section_order: string[];
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await serverGet<Payload>(`/pages/${slug}`, 300);

  return {
    title: data?.page.name ?? 'Page',
    description: data?.page.seo?.description,
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await serverGet<Payload>(`/pages/${slug}`, 300);

  if (!data) notFound();

  return (
    <>
      <Breadcrumb title={data.page.name} />
      <CmsPageSections sections={data.sections} order={data.section_order} />
    </>
  );
}
