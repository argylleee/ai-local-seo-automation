import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@local-seo/db", "@local-seo/schemas"],
};

export default nextConfig;
