import type { MetadataRoute } from "next";

import { locales } from "@/i18n/config";
import { getRetailSitemapEntries } from "@/server/services/retail-catalog";

export const revalidate = 3600;

const pages = [
  "",
  "/products",
  "/categories",
  "/contact",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const catalog = await getRetailSitemapEntries();
  const localized = (path: string) => ({
    languages: {
      "de-CH": `${origin}/de${path}`,
      "en-CH": `${origin}/en${path}`,
      "x-default": `${origin}/de${path}`,
    },
  });
  const staticEntries = pages.flatMap((path) =>
    locales.map((locale) => ({
      url: `${origin}/${locale}${path}`,
      changeFrequency:
        path === "/products" || path === "/categories"
          ? ("daily" as const)
          : ("monthly" as const),
      priority:
        path === "" ? 1 : path === "/products" ? 0.9 : path === "/categories" ? 0.8 : 0.6,
      alternates: localized(path),
    })),
  );
  const categoryEntries = catalog.categories.flatMap((category) => {
    const path = `/categories/${category.slug}`;
    return locales.map((locale) => ({
      url: `${origin}/${locale}${path}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: localized(path),
      images: category.imageUrl ? [category.imageUrl] : undefined,
    }));
  });
  const productEntries = catalog.products.flatMap((product) => {
    const path = `/products/${product.slug}`;
    return locales.map((locale) => ({
      url: `${origin}/${locale}${path}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: localized(path),
      images: product.imageUrl ? [product.imageUrl] : undefined,
    }));
  });
  return [...staticEntries, ...categoryEntries, ...productEntries];
}
