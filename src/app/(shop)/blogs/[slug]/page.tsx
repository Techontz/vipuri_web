import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { serverGet } from '@/lib/server';
import { formatDate, imageUrl, plainText } from '@/lib/format';

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
          <div className="row gy-5">
            <div className="col-lg-8">
              <article className="blog-article">
                <div className="blog-article__hero">
                  <img src={imageUrl(data.blog.image)} alt="" />
                </div>
                <span className="blog-article__date">
                  <i className="las la-calendar" aria-hidden="true" /> {formatDate(data.blog.created_at)}
                </span>
                <h2 className="blog-article__title">{data.blog.title}</h2>
                <div className="blog-prose" dangerouslySetInnerHTML={{ __html: data.blog.description }} />
              </article>
            </div>
            <div className="col-lg-4">
              <aside className="blog-sidebar">
                <h2 className="blog-sidebar__title h5">Latest articles</h2>
                <ul className="blog-sidebar__list">
                  {data.latest_blogs
                    .filter((blog) => blog.slug !== data.blog.slug)
                    .slice(0, 5)
                    .map((blog) => (
                      <li className="blog-sidebar__item" key={blog.slug}>
                        <Link className="blog-sidebar__link" href={`/blogs/${blog.slug}`}>
                          <img className="blog-sidebar__thumb" src={imageUrl(blog.image)} alt="" loading="lazy" />
                          <span className="blog-sidebar__text">
                            <span className="blog-sidebar__name">{blog.title}</span>
                            <span className="blog-sidebar__date">{formatDate(blog.created_at)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
                <Link className="blog-sidebar__all" href="/blogs">
                  All articles <i className="las la-arrow-right" aria-hidden="true" />
                </Link>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
