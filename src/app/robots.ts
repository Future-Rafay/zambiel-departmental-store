import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/de/account/",
        "/en/account/",
        "/de/checkout",
        "/en/checkout",
        "/de/order/",
        "/en/order/",
        "/de/orders/",
        "/en/orders/",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
