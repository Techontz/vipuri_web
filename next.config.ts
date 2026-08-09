import path from 'node:path';
import type { NextConfig } from 'next';

const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:8000';
const { protocol, hostname, port } = new URL(backend);

const nextConfig: NextConfig = {
  // Local development is reached over both localhost and 127.0.0.1; without
  // this Next blocks dev asset requests from the second origin.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  // The repository root sits above this package; pinning it stops Turbopack
  // from walking up to the home directory looking for a lockfile.
  turbopack: {
    root: path.join(__dirname),
  },

  images: {
    remotePatterns: [
      {
        protocol: protocol.replace(':', '') as 'http' | 'https',
        hostname,
        port: port || undefined,
        pathname: '/media/**',
      },
    ],
  },

  // The purchased theme ships its own reset and utility layers; Next's
  // built-in image optimiser is bypassed for theme assets that must render
  // byte-identically to the original.
  poweredByHeader: false,
  reactStrictMode: true,

  /*
   * Response headers only — nothing here touches markup, styling or layout,
   * so the rendered page stays byte-identical to the original design.
   *
   * No Content-Security-Policy: the purchased theme relies on inline scripts
   * and inline style attributes throughout, and a policy loose enough to
   * permit them ('unsafe-inline' for both) would buy nothing. Adding one
   * means refactoring the theme, which is out of scope here.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // The storefront is never meant to be framed.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Send the origin to third parties, never the full path.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
