import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d2xsxph8kpxj0f.cloudfront.net",
      },
    ],
  },
  typescript: {
    // Convex source files are type-checked by `npx convex dev`, not Next.js.
    // The generated types in convex/_generated/ may be stale until that runs.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
