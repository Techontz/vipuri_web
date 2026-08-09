import { AccountLayout } from '@/components/account/AccountLayout';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayout>{children}</AccountLayout>;
}
