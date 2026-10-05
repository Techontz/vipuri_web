'use client';

import { useSettings } from '@/components/providers/AppProviders';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

/** The cookie policy page, mirroring `templates/basic/cookie.blade.php`. */
export function CookiePolicyContent() {
  const settings = useSettings();
  const description = settings?.cookie?.description ?? '';

  return (
    <>
      <Breadcrumb title="Cookie Policy" />

      <section className="my-120">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              {/* Authored by an administrator in the CMS, same as the original. */}
              <div dangerouslySetInnerHTML={{ __html: description }} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
