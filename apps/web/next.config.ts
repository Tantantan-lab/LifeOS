import type { NextConfig } from "next";

// NEXT_STATIC_EXPORT=1 → GitHub Pages demo build: fully static output under
// the /LifeOS sub-path. Without it the Docker/standalone path is unchanged.
const STATIC_EXPORT = process.env.NEXT_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Docker runner stage ships only .next/standalone + static assets.
  // Dev on the host is unaffected.
  output: STATIC_EXPORT ? ("export" as const) : ("standalone" as const),
  basePath: STATIC_EXPORT ? "/LifeOS" : undefined,
};

export default nextConfig;
