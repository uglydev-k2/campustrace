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
          // No camera, microphone or location access, and no FLoC-style topics.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          // HTTPS only, once a browser has seen the site over HTTPS. Harmless
          // in local development, where the header is simply ignored on http.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Baseline CSP. Scripts are not restricted here because Next.js
          // needs inline bootstrap scripts (a nonce-based policy is the next
          // step, see docs/security.md); the directives below close the
          // common gaps regardless: no framing, no plugins, no form posting
          // elsewhere, no <base> hijacking, and only same-origin media.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              // React needs eval() in development only, for its debugging tools.
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
