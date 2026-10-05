import type { Metadata } from 'next';

import { ContactContent } from '@/components/site/ContactContent';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Talk to the VIPURI team about parts, fitment, orders or trade accounts.',
};

export default function ContactPage() {
  return <ContactContent />;
}
