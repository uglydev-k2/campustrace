import type { NextConfig } from "next";

/**
 * CampusTrace renders every page at request time.
 *
 * Almost every screen depends on who is signed in and on workflow state that
 * must never be stale (custody, claim decisions, handovers), so we use the
 * straightforward "render on each request" model instead of Cache Components.
 * See docs/architecture.md for the reasoning.
 */
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // Report and claim forms carry up to three 4 MB files.
      bodySizeLimit: "14mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
