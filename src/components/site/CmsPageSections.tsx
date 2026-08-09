'use client';

import type { CmsBlock } from '@/types';
import { imageUrl } from '@/lib/format';

/**
 * Renders a CMS-built page. Only the section types the source template
 * supported on secondary pages are handled; anything else is skipped rather
 * than rendered as raw data.
 */
export function CmsPageSections({
  sections,
  order,
}: {
  sections: Record<string, CmsBlock | CmsBlock[]>;
  order: string[];
}) {
  const content = (key: string) => (sections[`${key}.content`] ?? {}) as Record<string, string>;
  const elements = (key: string) => (Array.isArray(sections[`${key}.element`]) ? (sections[`${key}.element`] as Record<string, string>[]) : []);

  return (
    <>
      {order.map((key) => {
        switch (key) {
          case 'about': {
            const block = content('about');
            if (!block.subtitle && !block.description) return null;

            return (
              <section className="about my-120" key={key}>
                <div className="container">
                  <div className="row flex-wrap-reverse gy-4">
                    <div className="col-lg-6">
                      <div className="section-heading style-left">
                        <span className="section-heading__tagline">{block.title}</span>
                        <h2 className="section-heading__title">{block.subtitle}</h2>
                        <div className="section-heading__desc mb-3" dangerouslySetInnerHTML={{ __html: block.description ?? '' }} />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      {block.image && <img className="about-video__thumb" src={imageUrl(block.image)} alt="about" />}
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          case 'highlight': {
            const items = elements('highlight');
            if (items.length === 0) return null;

            return (
              <section className="highlight my-60" key={key}>
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

          case 'testimonial': {
            const items = elements('testimonial');
            if (items.length === 0) return null;

            return (
              <section className="testimonial my-120" key={key}>
                <div className="container">
                  <div className="row gy-4">
                    {items.slice(0, 6).map((item, index) => (
                      <div className="col-lg-4 col-md-6" key={index}>
                        <div className="testimonial-card">
                          <div className="testimonial-card__body">
                            <p className="testimonial-card__desc">{item.review}</p>
                          </div>
                          <div className="testimonial-card__footer">
                            <div className="testimonial-card-info">
                              {item.image && <img className="testimonial-card-info__thumb" src={imageUrl(item.image)} alt={item.name} />}
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

          case 'client': {
            const items = elements('client');
            if (items.length === 0) return null;

            return (
              <section className="client my-120" key={key}>
                <div className="container">
                  <div className="row justify-content-center align-items-center gy-4">
                    {items.map((item, index) => (
                      <div className="col-4 col-md-2" key={index}>
                        <div className="client-item">{item.image && <img src={imageUrl(item.image)} alt="client" />}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          default:
            return null;
        }
      })}
    </>
  );
}
