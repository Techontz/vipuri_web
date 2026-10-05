import type { Metadata } from 'next';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { serverGet } from '@/lib/server';
import type { Branch } from '@/types';

export const metadata: Metadata = {
  title: 'Our Branches',
  description:
    'Visit VIPURI in Dar es Salaam, Arusha, Mwanza or Dodoma. Opening hours, phone numbers and directions for every branch.',
};

export const revalidate = 300;
/**
 * Local part of a branch number. Numbers should be stored without the country
 * code (the branch carries `dial_code` separately), but older rows held it
 * inline as "255 22 …" — strip it so it is never shown or dialled twice.
 */
function localNumber(phone: string, dialCode: string | null): string {
  const digits = (dialCode ?? '').replace(/\D/g, '');
  let value = phone.trim();

  if (digits) {
    const stripped = value.replace(new RegExp(`^(\\+|00)?${digits}[\\s-]*`), '');
    // Only when what is left is still a full local number.
    if (stripped !== value && stripped.replace(/\D/g, '').length >= 7) value = stripped;
  }

  return value;
}

/** "Street, City, Region" — the region only when it adds something. */
function branchAddress(branch: Branch): string {
  const parts = [branch.address, branch.city];

  if (branch.region && branch.region.trim().toLowerCase() !== (branch.city ?? '').trim().toLowerCase()) {
    parts.push(branch.region);
  }

  return parts.filter((part): part is string => Boolean(part && part.trim())).join(', ');
}

export default async function BranchesPage() {
  const data = await serverGet<{ branches: Branch[] }>('/branches', 300);
  const branches = data?.branches ?? [];

  return (
    <>
      <Breadcrumb title="Our Branches" />

      <section className="branches my-120">
        <div className="container">
          <div className="section-heading style-left">
            <span className="section-heading__tagline">Countrywide</span>
            <div className="section-heading__inner">
              <h2 className="section-heading__title">Find your nearest VIPURI counter</h2>
            </div>
          </div>

          <div className="row gy-4">
            {branches.map((branch) => (
              <div className="col-lg-4 col-md-6" key={branch.id}>
                <div className={`branch-card branch-card--stack${branch.is_default ? ' branch-card--head' : ''}`}>
                  {branch.is_default && <span className="branch-card__badge">Head office</span>}
                  <h3 className="branch-card__title h5">{branch.name}</h3>

                  <div className="branch-card__body">

                    {branch.address && (
                      <div className="branch-card__meta">
                        <i className="las la-map-marker-alt" />
                        <span>{branchAddress(branch)}</span>
                      </div>
                    )}

                    {branch.phone && (
                      <div className="branch-card__meta">
                        <i className="las la-phone" />
                        <a
                          href={`tel:${branch.dial_code ?? ''}${localNumber(branch.phone, branch.dial_code).replace(/\D/g, '').replace(/^0/, '')}`}
                        >
                          {[branch.dial_code, localNumber(branch.phone, branch.dial_code)].filter(Boolean).join(' ')}
                        </a>
                      </div>
                    )}

                    {branch.email && (
                      <div className="branch-card__meta">
                        <i className="las la-envelope" />
                        <a href={`mailto:${branch.email}`}>{branch.email}</a>
                      </div>
                    )}

                  {branch.is_pickup_point && (
                      <div className="branch-card__meta">
                        <i className="las la-store" />
                        <span>Click &amp; collect available</span>
                      </div>
                    )}
                  </div>

                  {branch.opening_hours && (
                    <div className="branch-card__hours branch-card__foot">
                      <dl>
                        {Object.entries(branch.opening_hours).map(([day, hours]) => (
                          <div key={day} className="branch-card__hours-row">
                            <dt>{day}</dt>
                            <dd>{hours}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
