import path from "node:path";
import type { NextConfig } from "next";

/** PostCSS → `nanoid/non-secure`. Turbopack sometimes fails to resolve the subpath; shim is stable. */
const nanoidNonSecure = path.join(process.cwd(), "vendor/nanoid-non-secure.cjs");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string | false | string[]>),
      "nanoid/non-secure": nanoidNonSecure,
    };
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
    ],
  },
};

export default nextConfig;
