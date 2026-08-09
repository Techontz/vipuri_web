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
                <div className="branch-card">
                  {branch.is_default && <span className="branch-card__badge">Head office</span>}
                  <h5 className="branch-card__title">{branch.name}</h5>

                  {branch.address && (
                    <div className="branch-card__meta">
                      <i className="las la-map-marker-alt" />
                      <span>
                        {branch.address}
                        {branch.city ? `, ${branch.city}` : ''}
                        {branch.region ? `, ${branch.region}` : ''}
                      </span>
                    </div>
                  )}

                  {branch.phone && (
                    <div className="branch-card__meta">
                      <i className="las la-phone" />
                      <a href={`tel:${branch.dial_code ?? ''}${branch.phone}`}>
                        {branch.dial_code} {branch.phone}
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

                  {branch.opening_hours && (
                    <div className="branch-card__hours">
                      <dl>
                        {Object.entries(branch.opening_hours).map(([day, hours]) => (
                          <div key={day} style={{ display: 'contents' }}>
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
