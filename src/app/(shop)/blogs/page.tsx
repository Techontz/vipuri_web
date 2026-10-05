import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { serverGet } from '@/lib/server';
import { formatDate, imageUrl, plainText } from '@/lib/format';

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

/**
 * Card teaser: the article's opening paragraph, cut at a word boundary.
 * Flattening the whole body merged the sub-headings into the sentence and
 * sliced words in half ("…Toyota Prados and H…").
 */
function excerpt(html: string, limit = 120): string {
  const firstParagraph = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(html)?.[1] ?? html;
  const text = plainText(firstParagraph, Number.MAX_SAFE_INTEGER);

  if (text.length <= limit) return text;

  const cut = text.slice(0, limit + 1);
  const boundary = cut.lastIndexOf(' ');

  return `${(boundary > limit * 0.6 ? cut.slice(0, boundary) : text.slice(0, limit)).replace(/[\s,;:.\-–—]+$/, '')}…`;
}

export default async function BlogsPage() {
  const data = await serverGet<{ blogs: BlogSummary[]; content: Record<string, string> | null }>('/blogs', 120);
  const blogs = data?.blogs ?? [];

  return (
    <>
      <Breadcrumb title={data?.content?.title ?? 'Latest News'} />

      <section className="blog my-120">
        <div className="container">
          {blogs.length === 0 && (
            <div className="account-empty">
              <div className="account-empty__icon">
                <i className="las la-newspaper" aria-hidden="true" />
              </div>
              <h2 className="account-empty__title h5">No articles yet</h2>
              <p className="account-empty__desc">
                Maintenance guides and buying advice from our workshop will appear here soon.
              </p>
              <Link className="btn btn--base" href="/products">
                Browse parts
              </Link>
            </div>
          )}

          <div className="row gy-4">
            {blogs.map((blog) => (
              <div className="col-xxl-4 col-lg-4 col-md-6" key={blog.id}>
                <article className="blog-card blog-card--list">
                  <div className="blog-card__thumb">
                    <img src={imageUrl(blog.image)} alt="" loading="lazy" />
                  </div>
                  <div className="blog-card__content">
                    <div className="blog-card__content-body">
                      <h2 className="blog-card__title h5">
                        <Link href={`/blogs/${blog.slug}`}>{blog.title}</Link>
                      </h2>
                      <p className="blog-card__desc">{excerpt(blog.description)}</p>
                    </div>
                    <div className="blog-card__content-footer">
                      <span className="blog-card__date">
                        <i className="las la-calendar" aria-hidden="true" /> {formatDate(blog.created_at)}
                      </span>
                      <span className="blog-card__more" aria-hidden="true">
                        Read more <i className="las la-arrow-right" />
                      </span>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
