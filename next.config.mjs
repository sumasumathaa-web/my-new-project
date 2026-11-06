/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // NOTE: X-Frame-Options / frame-ancestors intentionally omitted so the app can be
  // embedded in the hosting/preview environment. Add a strict CSP in production if desired.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "media-src 'self' https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com",
      "frame-src https://api.razorpay.com https://checkout.razorpay.com",
      "font-src 'self' data:",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  // Embedded Postgres (local dev only) ships WebAssembly — never bundle it.
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    serverComponentsExternalPackages: ["@electric-sql/pglite"],
  },
  eslint: {
    // Build speed & CI friendliness: linting run separately when configured.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
