import type { Metadata } from 'next';

import { AccountTicketDetail } from '@/components/account/AccountPages';

export const metadata: Metadata = { title: 'Support ticket' };

export default async function Page({ params }: { params: Promise<{ ticketNumber: string }> }) {
  const { ticketNumber } = await params;
  return <AccountTicketDetail ticketNumber={ticketNumber} />;
}
