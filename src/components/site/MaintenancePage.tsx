import type { SiteSettings } from '@/types';

/**
 * Shown in place of every storefront page while the shop is closed,
 * mirroring `templates/basic/maintenance.blade.php`.
 *
 * Both the artwork and the copy come from the CMS, so an administrator can say
 * what is happening without a deploy.
 */
export function MaintenancePage({ content }: { content: SiteSettings['maintenance'] }) {
  return (
    <section className="maintenance-page flex-column d-flex align-items-center justify-content-center h-100">
      <div className="container">
        <div className="row justify-content-center align-items-center">
          <div className="col-lg-7 text-center">
            {content?.image && (
              <div className="row justify-content-center">
                <div className="col-sm-6 col-8 col-lg-12">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="img-fluid mx-auto mb-5" src={content.image} alt="image" />
                </div>
              </div>
            )}

            <div
              className="mx-auto text-center"
              dangerouslySetInnerHTML={{
                __html:
                  content?.description ??
                  '<h3>The store is temporarily closed</h3><p>We are carrying out planned maintenance. Please check back shortly.</p>',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
