import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const isProd = process.env.NODE_ENV === "production";

/**
 * Hosts allowed to talk to the dev server. Next.js otherwise rejects requests
 * whose origin is not localhost, which silently kills hydration: the login and
 * sign-up pages render but every button and submit does nothing (the form falls
 * back to a native GET), so sign-in looks broken on 127.0.0.1 or a LAN address.
 */
function devOrigins(): string[] {
  const hosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) hosts.add(entry.address);
    }
  }

  for (const extra of (process.env.ALLOWED_DEV_ORIGINS || "").split(",")) {
    const host = extra.trim();
    if (host) hosts.add(host);
  }

  return [...hosts];
}

const nextConfig: NextConfig = {
  // Emits .next/standalone — a self-contained Node server used by the
  // `client` Docker target and the Kubernetes client Deployment.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  compiler: {
    removeConsole: true,
  },

  // Fail the production build on type errors instead of shipping broken pages.
  typescript: { ignoreBuildErrors: false },

  // No floating dev badge: it covers the bottom-left corner of the UI (and
  // swallowed clicks on form controls near it).
  devIndicators: false,

  // Development only: the production server has no dev-origin gate.
  ...(isProd ? {} : { allowedDevOrigins: devOrigins() }),

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
