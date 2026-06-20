import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "bullmq"],
  transpilePackages: ["@visa-platform/ui"],
};

export default nextConfig;
