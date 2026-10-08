// Plain JavaScript (not .ts) so hosts that wrap the config file (e.g. Hostinger)
// can load it without a TypeScript step.

const isProd = process.env.NODE_ENV === "production";

// Strict-but-practical CSP: no third-party origins are used at runtime
// (fonts are self-hosted by next/font, logos are data: URLs).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Every page here is behind login and shows live data, so request-time
  // rendering is the right default; Cache Components stays off.
  cacheComponents: false,
  // Standalone output only for Docker/self-hosted builds; Hostinger runs `next start`.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  serverExternalPackages: ["mariadb", "@prisma/adapter-mariadb", "exceljs", "jspdf", "jspdf-autotable"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
