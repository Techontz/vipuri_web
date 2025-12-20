const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
  });
  
  const nextConfig = {
    images: {
      unoptimized: true,
      remotePatterns: [
        { protocol: "https", hostname: "vipuri.co.tz", pathname: "/**" },
        { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/**" },
        { protocol: "http", hostname: "localhost", port: "8000", pathname: "/**" },
      ],
    },
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
    trailingSlash: true,
    output: "export",
    compiler: {
      removeConsole: process.env.NODE_ENV === "production",
    },
  };
  
  module.exports = withBundleAnalyzer(nextConfig);
  