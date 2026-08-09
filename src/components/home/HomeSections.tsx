'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { ProductCard } from '@/components/product/ProductCard';
import { VehicleFinder } from '@/components/product/VehicleFinder';
import { formatDate, imageUrl } from '@/lib/format';
import type { HomePayload, ProductCard as ProductCardType } from '@/types';

type Block = Record<string, string>;

/**
 * Fixed star rating from a CMS number field, matching the source `rating()`
 * helper: a half star when the value falls between two whole numbers.
 */
function StaticRating({ value }: { value: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => {
        if (value > index && value < index + 1) {
          return <i className="las la-star-half-alt" key={index} />;
        }
        return value > index ? <i className="las la-star" key={index} /> : <i className="lar la-star" key={index} />;
      })}
    </>
  );
}

/** Read a CMS content block, tolerating a missing section. */
function block(sections: HomePayload['sections'], key: string): Block {
  const value = sections?.[`${key}.content`];
  return (Array.isArray(value) ? {} : ((value ?? {}) as Block)) ?? {};
}

/** Read a CMS element list. */
function elements(sections: HomePayload['sections'], key: string): Block[] {
  const value = sections?.[`${key}.element`];
  return Array.isArray(value) ? (value as Block[]) : [];
}

/**
 * CMS image fields already arrive as absolute URLs from the API
 * (see App\Support\CmsContent), so this only supplies the fallback.
 */
function cmsImage(url?: string | null): string {
  return url && url.length > 0 ? url : '/assets/images/default.png';
}

/** Section title block used by most home sections. */
function SectionHeading({ tag, title, buttonText, buttonUrl }: { tag?: string; title?: string; buttonText?: string; buttonUrl?: string }) {
  return (
    <div className="section-heading style-left">
      {tag && <span className="section-heading__tagline">{tag}</span>}
      <div className="section-heading__inner">
        <h2 className="section-heading__title">{title}</h2>
        {buttonText && (
          <Link className="section-heading__viewmore" href={buttonUrl ? `/${buttonUrl.replace(/^\//, '')}` : '/products'}>
            {buttonText}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-square-arrow-out-up-right-icon"
            >
              <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
              <path d="m21 3-9 9" />
              <path d="M15 3h6v6" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Banner -------------------------------- */

function BannerSection({ items }: { items: Block[] }) {
  if (items.length === 0) return null;

  return (
    <section className="banner">
      <div className="banner-body">
        <div className="banner-slider">
          {items.map((banner, index) => (
            <div className="banner-slider__slide" key={index}>
              <div
                className="banner-slider-item bg-img"
                data-background-image={cmsImage(banner.image)}
                style={{ backgroundImage: `url(${cmsImage(banner.image)})` }}
              >
                <div className="banner-slider-item__main">
                  <div className="container">
                    <div className="row">
                      <div className="col-lg-6">
                        <div className="banner-slider-item__content">
                          <span className="banner-slider-item__tagline">{banner.tag}</span>
                          <h1
                            className="banner-slider-item__title"
                            data-highlight-position={banner.highlight_position ?? 0}
                          >
                            {banner.heading}
                          </h1>
                          <p className="banner-slider-item__desc">{banner.short_description}</p>
                          <Link className="btn btn--base" href={banner.click_url ? `/${banner.click_url.replace(/^\//, '')}` : '/products'}>
                            {banner.button_text || 'Shop Now'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Popular categories --------------------------- */

function PopularCategoriesSection({ content, categories }: { content: Block; categories: HomePayload['popular_categories'] }) {
  if (categories.length === 0) return null;

  return (
    <section className="popular-cat mt-60 mb-120">
      <div className="container">
        <SectionHeading tag={content.tag} title={content.title} buttonText={content.button} buttonUrl={content.button_url} />
        <div className="row justify-content-center g-3">
          {categories.slice(0, 6).map((category) => (
            <div className="col-6 col-md-3 col-xl-2" key={category.id}>
              <Link className="cat-card" href={`/products?category=${category.slug}`}>
                <img className="cat-card__thumb" src={imageUrl(category.image ?? category.icon)} alt="image" />
                <span className="cat-card__name">{category.name}</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- Latest products ---------------------------- */

function LatestProductSection({ content, products }: { content: Block; products: ProductCardType[] }) {
  // The original groups the latest arrivals by top-level category tabs.
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; products: ProductCardType[] }>();

    products.forEach((product) => {
      const category = product.categories?.[0];
      const key = category?.slug ?? 'all';

      if (!map.has(key)) {
        map.set(key, { name: category?.name ?? 'All Products', slug: key, products: [] });
      }

      map.get(key)!.products.push(product);
    });

    return Array.from(map.values()).slice(0, 7);
  }, [products]);

  if (groups.length === 0) return null;

  return (
    <section className="latest-product my-120">
      <div className="container">
        <SectionHeading tag={content.tag} title={content.title} buttonText={content.button} buttonUrl={content.button_url} />

        <div className="row gy-4">
          <div className="col-lg-3">
            <div className="latest-product-tab" role="tablist">
              {groups.map((group, index) => (
                <button
                  className={`latest-product-tab__btn ${index === 0 ? 'active' : ''}`}
                  type="button"
                  id={`latest-cat-${group.slug}-tab`}
                  data-bs-toggle="tab"
                  data-bs-target={`#latest-cat-${group.slug}-tab-pane`}
                  role="tab"
                  aria-controls={`latest-cat-${group.slug}-tab-pane`}
                  aria-selected={index === 0}
                  key={group.slug}
                >
                  <span className="text">{group.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="col-lg-9">
            <div className="tab-content">
              {groups.map((group, index) => (
                <div
                  className={`tab-pane fade ${index === 0 ? 'show active' : ''}`}
                  id={`latest-cat-${group.slug}-tab-pane`}
                  role="tabpanel"
                  aria-labelledby={`latest-cat-${group.slug}-tab`}
                  tabIndex={0}
                  key={group.slug}
                >
                  <div className="row gy-4">
                    {group.products.slice(0, 3).map((product) => (
                      <div className="col-sm-6 col-md-4" key={product.id}>
                        <ProductCard product={product} showcase="popular" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- CTA --------------------------------- */

function CtaSection({ content }: { content: Block }) {
  if (!content.title) return null;

  return (
    <section className="cta my-120">
      <div className="container">
        <div
          className="cta-wrap bg-img"
          data-background-image={cmsImage(content.image)}
          style={{ backgroundImage: `url(${cmsImage(content.image)})` }}
        >
          <div className="row">
            <div className="col-lg-8">
              <div className="cta-content">
                {content.tag && <span className="cta-content__tag">{content.tag}</span>}
                <h2 className="cta-content__title">{content.title}</h2>
                <p className="cta-content__desc">{content.description}</p>
                <div className="cta-content__btns">
                  <Link href={`/${(content.first_button_url ?? 'products').replace(/^\//, '')}`} className="btn btn--base">
                    {content.first_button_text || 'View Shop'}
                  </Link>
                  <Link href={`/${(content.second_button_url ?? 'register').replace(/^\/?(user\/)?/, '')}`} className="btn btn--white">
                    {content.second_button_text || 'Get Started'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Brands -------------------------------- */

function BrandSection({ content, brands }: { content: Block; brands: HomePayload['popular_brands'] }) {
  if (brands.length === 0) return null;

  return (
    <section className="brand my-120">
      <div className="container">
        <div className="brand-card">
          <div className="row gy-4 align-items-center">
            <div className="col-xl-4">
              <div className="section-heading style-left">
                <span className="section-heading__tagline">{content.tag}</span>
                <div className="section-heading__inner">
                  <h2 className="section-heading__title">{content.title}</h2>
                </div>
              </div>
              <Link className="btn btn--base" href="/brands">
                {content.button || 'View All Brands'}
              </Link>
            </div>
            <div className="col-xl-8">
              <div className="row justify-content-center gy-4">
                {brands.slice(0, 8).map((brand) => (
                  <div className="col-md-3 col-4" key={brand.id}>
                    <Link className="brand-item" href={`/products?brand_slug=${brand.slug}`}>
                      <div className="brand-item__logo">
                        <img src={imageUrl(brand.logo)} alt="brand image" />
                      </div>
                      <span className="brand-item__name">{brand.name}</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Sliders --------------------------------- */

function TopDealSection({ content, products }: { content: Block; products: ProductCardType[] }) {
  if (products.length === 0) return null;

  return (
    <section className="top-deal my-120">
      <div className="container">
        <SectionHeading tag={content.tag} title={content.title} buttonText={content.button} buttonUrl={content.button_url} />
        <div className="top-deal-slider">
          {products.map((product) => (
            <div className="top-deal-slider__slide" key={product.id}>
              <ProductCard product={product} showcase="deal" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TopSellingSection({ content, products }: { content: Block; products: ProductCardType[] }) {
  if (products.length === 0) return null;

  return (
    <section className="top-selling my-120">
      <div className="container">
        <SectionHeading tag={content.tag} title={content.title} buttonText={content.button} buttonUrl={content.button_url} />
        <div className="top-selling-slider">
          {products.map((product) => (
            <div className="top-selling-slider__slide" key={product.id}>
              <ProductCard product={product} showcase="popular" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LimitedStockSection({ content, products }: { content: Block; products: ProductCardType[] }) {
  if (products.length === 0) return null;

  return (
    <section className="limited-stock py-120">
      <div className="container">
        <SectionHeading tag={content.tag} title={content.title} buttonText={content.button} buttonUrl={content.button_url} />
        <div className="limited-stock-slider">
          {products.map((product) => (
            <div className="limited-stock-slider__slide" key={product.id}>
              <ProductCard product={product} showcase="deal" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpecialOfferSection({ content, products }: { content: Block; products: ProductCardType[] }) {
  if (products.length === 0) return null;

  return (
    <section className="special-offer my-120">
      <div className="container">
        <div className="section-heading style-left">
          <span className="section-heading__tagline">{content.title}</span>
          <div className="section-heading__inner">
            <h2 className="section-heading__title">{content.subtitle}</h2>
            <Link className="section-heading__viewmore" href="/products?deals=1">
              {content.button_name || 'View all'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-square-arrow-out-up-right-icon"
              >
                <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
                <path d="m21 3-9 9" />
                <path d="M15 3h6v6" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-9">
            <div className="row gy-4">
              {products.slice(0, 3).map((product) => (
                <ProductCard product={product} showcase="special_offer_product" key={product.id} />
              ))}
            </div>
          </div>
          <div className="col-lg-3">
            <div
              className="special-offer-sidebar bg-img"
              data-background-image="/assets/templates/basic/images/thumbs/special-offer-thumb.jpg"
              style={{ backgroundImage: 'url(/assets/templates/basic/images/thumbs/special-offer-thumb.jpg)' }}
            >
              <div className="special-offer-sidebar__body">
                <h3 className="special-offer-sidebar__title" data-highlight-position="[1,2]">
                  Genuine parts, fair prices, countrywide delivery
                </h3>
                <Link className="btn btn--sm btn--base" href="/products?deals=1">
                  Shop Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- About ---------------------------------- */

function AboutSection({ content, brandLogos }: { content: Block; brandLogos: Block[] }) {
  if (!content.subtitle && !content.description) return null;

  return (
    <section className="about my-120">
      <div className="container">
        <div className="row flex-wrap-reverse gy-4">
          <div className="col-lg-6">
            <div className="section-heading style-left">
              <span className="section-heading__tagline">{content.title}</span>
              <h2 className="section-heading__title">{content.subtitle}</h2>
              <p
                className="section-heading__desc mb-3"
                dangerouslySetInnerHTML={{ __html: content.description ?? '' }}
              />
            </div>
            <div className="about-rating">
              <img className="about-rating__thumb" src={cmsImage(content.avatar_image)} alt="image" />
              <div className="about-rating__content">
                <h5 className="about-rating__title">{content.review_text}</h5>
                <ul className="rating-list">
                  <StaticRating value={Number(content.rating ?? 0)} />
                  <li className="rating-list__item">
                    <span className="rating-list__text">{content.review_number}</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="about-brand">
              <div className="about-brand__left">
                <h6 className="about-brand__title">{content.brand_text}</h6>
              </div>
              <div className="about-brand__right">
                <div className="about-brand-slider">
                  {brandLogos.map((logo, index) => (
                    <div className="about-brand-slider__slide" key={index}>
                      <div className="about-brand-slider__thumb">
                        <img src={cmsImage(logo.brand_image)} alt="image" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <a className="about-video lightbox-image" href={content.video_url || '#'} data-caption="">
              <img className="about-video__thumb" src={cmsImage(content.image)} alt="image" />
              <span className="about-video__play">
                <i className="las la-play" />
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Highlights -------------------------------- */

function HighlightSection({ items }: { items: Block[] }) {
  if (items.length === 0) return null;

  return (
    <section className="highlight my-60">
      <div className="container">
        <div className="row gy-4">
          {items.map((item, index) => (
            <div className="col-xl-3 col-6" key={index}>
              <div className="highlight-item">
                <div className="highlight-item__icon" dangerouslySetInnerHTML={{ __html: item.icon ?? '' }} />
                <h6 className="highlight-item__title">{item.title}</h6>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Video feature ------------------------------ */

function VideoFeatureSection({ content }: { content: Block }) {
  if (!content.video_link) return null;

  return (
    <section className="video-feat my-120">
      <div className="container">
        <a className="video-feat-card lightbox-image" href={content.video_link} data-fancybox="gallery">
          <img className="video-feat-card__thumb" src={cmsImage(content.image)} alt="image" />
          <span className="video-feat-card__play">
            <i className="las la-play" />
          </span>
        </a>
      </div>
    </section>
  );
}

/* ------------------------------- Testimonial ------------------------------- */

function TestimonialSection({ content, items }: { content: Block; items: Block[] }) {
  if (items.length === 0) return null;

  return (
    <section className="testimonial my-120">
      <div className="container">
        <div className="section-heading style-left">
          <span className="section-heading__tagline">{content.title}</span>
          <div className="section-heading__inner">
            <h2 className="section-heading__title">{content.subtitle}</h2>
            <div className="testimonial-rating">
              <div className="testimonial-rating__count">{content.rating_number ?? '0'}</div>
              <div className="testimonial-rating__content">
                <div className="rating-list">
                  <StaticRating value={Number(content.rating ?? 0)} />
                </div>
                <span className="testimonial-rating__label">{content.review_text}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="testimonial-slider">
          {items.map((item, index) => (
            <div className="testimonial-slider__slide" key={index}>
              <div className="testimonial-card">
                <div className="testimonial-card__body">
                  <div className="rating-list">
                    <StaticRating value={Number(item.rating ?? 5)} />
                  </div>
                  <p className="testimonial-card__desc">{item.review}</p>
                </div>
                <div className="testimonial-card__footer">
                  <div className="testimonial-card-info">
                    <img className="testimonial-card-info__thumb" src={cmsImage(item.image)} alt="" />
                    <div className="testimonial-card-info__content">
                      <h6 className="testimonial-card-info__name">{item.name}</h6>
                      <span className="testimonial-card-info__designation">{item.designation}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Clients --------------------------------- */

function ClientSection({ items }: { items: Block[] }) {
  if (items.length === 0) return null;

  return (
    <section className="clients-section">
      <div className="outer-container clients-carousel owl-carousel owl-theme owl-dots-none">
        {items.map((item, index) => (
          <div className="clients-logo" key={index}>
            <a href="javascript:void(0)">
              <img src={cmsImage(item.image)} alt="image" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------- Blog ----------------------------------- */

function BlogSection({ content, items }: { content: Block; items: Block[] }) {
  if (items.length === 0) return null;

  return (
    <section className="blog my-120">
      <div className="container">
        <SectionHeading tag={content.tag} title={content.title} buttonText={content.button} buttonUrl="blogs" />

        <div className="row gy-4 justify-content-center">
          {items.slice(0, 3).map((blog, index) => (
            <div className="col-xxl-4 col-lg-4 col-md-6" key={index}>
              <div className="blog-card">
                <div className="blog-card__thumb">
                  <img src={cmsImage(blog.image)} alt="image" />
                </div>
                <div className="blog-card__content">
                  <div className="blog-card__content-body">
                    <h5 className="blog-card__title">
                      <Link href={`/blogs/${blog.slug ?? ''}`}>{blog.title}</Link>
                    </h5>
                  </div>
                  <div className="blog-card__content-footer">
                    <span className="blog-card__date">
                      <i className="las la-calendar" /> {formatDate(blog.created_at)}
                    </span>
                    <Link className="btn btn--sm btn--base" href={`/blogs/${blog.slug ?? ''}`}>
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
  );
}

/* ------------------------------- Orchestrator ------------------------------ */

export function HomeSections({ home }: { home: HomePayload }) {
  const sections = home.sections ?? {};
  const order = home.section_order?.length
    ? home.section_order
    : [
        'search',
        'popular_categories',
        'latest_product',
        'cta',
        'top_deals',
        'brand',
        'special_offer',
        'about',
        'top_selling_product',
        'limited_stock',
        'video_feature',
        'highlight',
        'testimonial',
        'blog',
        'client',
      ];

  const render = (key: string) => {
    switch (key) {
      case 'banner':
        return null; // rendered above the ordered list
      case 'search':
        return <VehicleFinder key={key} />;
      case 'popular_categories':
        return (
          <PopularCategoriesSection
            key={key}
            content={block(sections, 'popular_categories')}
            categories={home.popular_categories}
          />
        );
      case 'latest_product':
        return <LatestProductSection key={key} content={block(sections, 'latest_product')} products={home.latest_products} />;
      case 'cta':
        return <CtaSection key={key} content={block(sections, 'cta')} />;
      case 'top_deals':
        return <TopDealSection key={key} content={block(sections, 'top_deals')} products={home.top_deals} />;
      case 'brand':
        return <BrandSection key={key} content={block(sections, 'brand')} brands={home.popular_brands} />;
      case 'special_offer':
        return <SpecialOfferSection key={key} content={block(sections, 'special_offer')} products={home.featured_products} />;
      case 'about':
        return <AboutSection key={key} content={block(sections, 'about')} brandLogos={elements(sections, 'about')} />;
      case 'top_selling_product':
        return (
          <TopSellingSection key={key} content={block(sections, 'top_selling_product')} products={home.top_selling} />
        );
      case 'limited_stock':
        return <LimitedStockSection key={key} content={block(sections, 'limited_stock')} products={home.limited_stock} />;
      case 'video_feature':
        return <VideoFeatureSection key={key} content={block(sections, 'video_feature')} />;
      case 'highlight':
        return <HighlightSection key={key} items={elements(sections, 'highlight')} />;
      case 'testimonial':
        return <TestimonialSection key={key} content={block(sections, 'testimonial')} items={elements(sections, 'testimonial')} />;
      case 'client':
        return <ClientSection key={key} items={elements(sections, 'client')} />;
      case 'blog':
        return <BlogSection key={key} content={block(sections, 'blog')} items={elements(sections, 'blog')} />;
      default:
        return null;
    }
  };

  return (
    <>
      <BannerSection items={elements(sections, 'banner')} />
      {order.map((key) => render(key))}
    </>
  );
}

export { cmsImage };
