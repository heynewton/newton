import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // packages/calc is TypeScript source, shared with the other workspaces.
  transpilePackages: ["@newton/calc"],
  partialPrefetching: true,
  // The dev site and PR previews (NOINDEX=1, set only by .github/workflows/deploy.yml) ask search
  // engines not to index them, so they never compete with heynewton.app (#106).
  async headers() {
    if (process.env.NOINDEX !== "1") return [];
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
