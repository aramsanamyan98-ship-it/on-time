import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jwhzzjmtxlvemzsoqmgy.supabase.co",
        pathname: "/storage/v1/object/public/Uploads/**",
      },
    ],
  },
  // Default is 1MB. Profile/cover/portfolio photo uploads are compressed
  // client-side (src/lib/uploads/compressImage.ts) to fit the ~10MB cap
  // enforced in src/lib/storage.ts, so this needs enough headroom above
  // that for multipart/form-data boundary and field overhead.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
