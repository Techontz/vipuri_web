import { HomeSections } from '@/components/home/HomeSections';
import { getHome } from '@/lib/server';

export const revalidate = 60;

export default async function HomePage() {
  const home = await getHome();

  if (!home) {
    return (
      <section className="my-120">
        <div className="container text-center">
          <h2 className="section-heading__title">We&apos;ll be right back</h2>
          <p className="mt-3">The VIPURI catalogue is briefly unavailable. Please refresh in a moment.</p>
        </div>
      </section>
    );
  }

  return <HomeSections home={home} />;
}
