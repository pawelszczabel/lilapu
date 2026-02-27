import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://clerk.lilapu.com https://challenges.cloudflare.com https://*.posthog.com",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud wss://*.runpod.net https://*.clerk.com https://clerk.lilapu.com https://api.runpod.ai https://*.posthog.com https://eu.i.posthog.com",
      "img-src 'self' data: blob: https://img.clerk.com",
      "frame-src https://*.clerk.com https://clerk.lilapu.com https://challenges.cloudflare.com",
      "font-src 'self' data:",
      "worker-src 'self' blob:",
      "media-src 'self' blob:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
