import type { MetadataRoute } from "next";

import { locales } from "@/i18n/config";

const pages = [
  "",
  "/products",
  "/categories",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.APP_URL ?? "http://localhost:3000";
  return pages.flatMap((path) =>
    locales.map((locale) => ({
      url: `${origin}/${locale}${path}`,
      changeFrequency:
        path === "/products" || path === "/categories"
          ? ("daily" as const)
          : ("monthly" as const),
      priority:
        path === "" ? 1 : path === "/products" ? 0.9 : path === "/categories" ? 0.8 : 0.6,
      alternates: {
        languages: { de: `${origin}/de${path}`, en: `${origin}/en${path}` },
      },
    })),
  );
}
