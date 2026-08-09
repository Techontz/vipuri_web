import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProductDetails } from '@/components/product/ProductDetails';
import { getProduct } from '@/lib/server';
import { plainText } from '@/lib/format';
import type { ProductCard, ProductDetail } from '@/types';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProduct(slug);

  if (!data) return { title: 'Product not found' };

  const product = data.product as ProductDetail;

  return {
    title: product.meta.title || product.name,
    description:
      product.meta.description || plainText(product.short_description || product.description, 155),
    keywords: product.meta.keywords ?? undefined,
    openGraph: {
      title: product.meta.title || product.name,
      description: product.meta.description ?? undefined,
      images: product.gallery[0]?.url ? [product.gallery[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const data = await getProduct(slug);

  if (!data) notFound();

  return (
    <ProductDetails
      product={data.product as ProductDetail}
      relatedProducts={(data.related_products ?? []) as ProductCard[]}
    />
  );
}
