import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

import { securityHeaders } from "./src/config/security";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "examinox.s3.us-east-1.amazonaws.com"
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/s/files/**"
      }
    ]
  }
};

export default withNextIntl(nextConfig);
