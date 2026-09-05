import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@local-seo/db",
    "@local-seo/schemas",
    "@local-seo/integrations",
    "@local-seo/seo-engine",
    "@local-seo/ai",
    "@local-seo/logger",
    "@local-seo/shared",
    "@local-seo/crawler",
  ],
};

export default nextConfig;
