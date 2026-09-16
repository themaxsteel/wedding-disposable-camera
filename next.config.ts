import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Satu file per ikon, bukan seluruh barrel Phosphor, saat dev dan build.
    optimizePackageImports: ["@phosphor-icons/react"],
  },
};

export default nextConfig;
