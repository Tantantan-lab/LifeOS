import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker runner stage ships only .next/standalone + static assets.
  // Dev on the host is unaffected.
  output: "standalone",
};

export default nextConfig;
