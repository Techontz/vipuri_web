import { ThemeAssets } from '@/components/layout/ThemeAssets';

/**
 * Login and register.
 *
 * In the original these two views override `@section('panel')` wholesale, so
 * the header, page banner and footer never render — the split-screen account
 * card fills the viewport. This group reproduces that: the theme's assets and
 * nothing else.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeAssets />
      <div className="body-overlay" />
      {children}
    </>
  );
}
