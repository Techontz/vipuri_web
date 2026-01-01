/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ silence Turbopack conflict
  experimental: {
    turbo: false,
  },
};

module.exports = nextConfig;

