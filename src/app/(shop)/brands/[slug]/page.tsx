import { redirect } from 'next/navigation';

/**
 * The source system routed `brands/{slug}` to the shop listing filtered by that
 * brand. VIPURI expresses the same listing as `/products?brand_slug=…`, so the
 * original URL is kept alive and redirected rather than left to 404.
 */
export default async function BrandProductsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  redirect(`/products?brand_slug=${encodeURIComponent(slug)}`);
}
