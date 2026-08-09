import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { serverGet } from '@/lib/server';
import { formatDate, plainText } from '@/lib/format';
import { imageUrl } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Maintenance guides, buying advice and news from the VIPURI workshop.',
};

export const revalidate = 120;

type BlogSummary = {
  id: number;
  slug: string;
  title: string;
  description: string;
  image: string | null;
  created_at: string;
};

export default async function BlogsPage() {
  const data = await serverGet<{ blogs: BlogSummary[]; content: Record<string, string> | null }>('/blogs', 120);
  const blogs = data?.blogs ?? [];

  return (
    <>
      <Breadcrumb title={data?.content?.title ?? 'Latest News'} />

      <section className="blog my-120">
        <div className="container">
          <div className="row gy-4 justify-content-center">
            {blogs.map((blog) => (
              <div className="col-xxl-4 col-lg-4 col-md-6" key={blog.id}>
                <div className="blog-card">
                  <div className="blog-card__thumb">
                    <img src={imageUrl(blog.image)} alt={blog.title} />
                  </div>
                  <div className="blog-card__content">
                    <div className="blog-card__content-body">
                      <h5 className="blog-card__title">
                        <Link href={`/blogs/${blog.slug}`}>{blog.title}</Link>
                      </h5>
                      <p className="blog-card__desc">{plainText(blog.description, 120)}</p>
                    </div>
                    <div className="blog-card__content-footer">
                      <span className="blog-card__date">
                        <i className="las la-calendar" /> {formatDate(blog.created_at)}
                      </span>
                      <Link className="btn btn--sm btn--base" href={`/blogs/${blog.slug}`}>
                        Read More
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
