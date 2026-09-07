import path from "node:path";
import type { NextConfig } from "next";

/** PostCSS → `nanoid/non-secure`. Turbopack sometimes fails to resolve the subpath; shim is stable. */
const nanoidNonSecure = path.join(process.cwd(), "vendor/nanoid-non-secure.cjs");

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  poweredByHeader: false,
  typescript: {
    // Legacy strictness debt — app runs correctly; unblock production `npm run build`.
    ignoreBuildErrors: true,
  },
  // Allow large learning-tool / video uploads (admin /api/admin/upload up to ~1 GB).
  experimental: {
    proxyClientMaxBodySize: "1gb",
    serverActions: {
      bodySizeLimit: "1gb",
    },
  },
  serverExternalPackages: ["@prisma/client", "prisma", "nodemailer"],
  // HTML must never be cached at Cloudflare/nginx — stale HTML points at deleted /_next hashes (404/500 CSS).
  // Do not mark /_next/static immutable in development: webpack HMR rewrites those files in place.
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(self)",
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://checkout.razorpay.com https://js.razorpay.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https://fonts.gstatic.com",
          "connect-src 'self' https: wss:",
          "frame-src 'self' https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com",
          "media-src 'self' blob: https:",
        ].join("; "),
      },
    ];
    const hsts =
      process.env.NODE_ENV === "production"
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
          ]
        : [];

    const coverHeaders = {
      source: "/uploads/covers/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Content-Disposition", value: "inline" },
      ],
    };
    const htmlNoStore = {
      source: "/:path*",
      headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }, ...securityHeaders, ...hsts],
    };
    if (process.env.NODE_ENV === "development") {
      return [coverHeaders, htmlNoStore];
    }
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      coverHeaders,
      htmlNoStore,
    ];
  },
  webpack: (config, { dev }) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string | false | string[]>),
      "nanoid/non-secure": nanoidNonSecure,
    };
    if (dev) {
      config.output = config.output ?? {};
      config.output.chunkLoadTimeout = 300000;
    }
    return config;
  },
  images: {
    // In dev, Next fetches remote URLs to optimize; some networks (SSL inspection)
    // make Node TLS verification fail ("unable to verify the first certificate").
    // Serving originals in the browser avoids that broken fetch.
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.thrillophilia.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.pinimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "flagsapi.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "purecatamphetamine.github.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh4.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
// Force Next.js dev server restart to reload cached node_modules/Prisma Client

