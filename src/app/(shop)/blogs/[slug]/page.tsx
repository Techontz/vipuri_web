import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { serverGet } from '@/lib/server';
import { formatDate, plainText } from '@/lib/format';
import { imageUrl } from '@/lib/format';

type Blog = {
  slug: string;
  title: string;
  description: string;
  image: string | null;
  created_at: string;
};

type Payload = { blog: Blog; latest_blogs: Blog[] };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await serverGet<Payload>(`/blogs/${slug}`, 300);

  if (!data) return { title: 'Article not found' };

  return { title: data.blog.title, description: plainText(data.blog.description, 155) };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await serverGet<Payload>(`/blogs/${slug}`, 120);

  if (!data) notFound();

  return (
    <>
      <Breadcrumb title={data.blog.title} />

      <section className="blog-details my-120">
        <div className="container">
          <div className="row gy-4">
            <div className="col-lg-8">
              <article className="blog-details-card">
                <img className="blog-details-card__thumb" src={data.blog.image ?? '/assets/images/default.png'} alt={data.blog.title} />
                <div className="blog-details-card__content">
                  <span className="blog-card__date">
                    <i className="las la-calendar" /> {formatDate(data.blog.created_at)}
                  </span>
                  <h2 className="blog-details-card__title mt-2">{data.blog.title}</h2>
                  <div className="mt-4" dangerouslySetInnerHTML={{ __html: data.blog.description }} />
                </div>
              </article>
            </div>
            <div className="col-lg-4">
              <div className="checkout-card">
                <h5 className="checkout-card__title">Latest articles</h5>
                <ul className="blog-sidebar-list">
                  {data.latest_blogs.map((blog) => (
                    <li className="blog-sidebar-list__item d-flex gap-3 py-3" key={blog.slug}>
                      <img src={imageUrl(blog.image)} alt={blog.title} width={72} height={56} style={{ objectFit: 'cover', borderRadius: 6 }} />
                      <div>
                        <Link href={`/blogs/${blog.slug}`}>{blog.title}</Link>
                        <span className="d-block" style={{ fontSize: 13 }}>{formatDate(blog.created_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
