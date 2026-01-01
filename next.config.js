/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // ✅ Local Laravel (development only)
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
      },

      // ✅ Vipuri production backend
      {
        protocol: "https",
        hostname: "api.vipuri.co.tz",
      },
    ],
  },
};

module.exports = nextConfig;
