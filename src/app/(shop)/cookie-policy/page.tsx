import type { Metadata } from 'next';

import { CookiePolicyContent } from '@/components/site/CookiePolicyContent';

export const metadata: Metadata = { title: 'Cookie Policy' };

export default function CookiePolicyPage() {
  return <CookiePolicyContent />;
}
