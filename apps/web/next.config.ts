import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@local-seo/db", "@local-seo/schemas", "@local-seo/integrations"],
};

export default nextConfig;
