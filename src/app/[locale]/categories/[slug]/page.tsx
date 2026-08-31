import { notFound } from "next/navigation";
import Link from "next/link";

import { RetailProductCard } from "@/components/site/retail-product-card";
import type { StoreLocale } from "@/config/store";
import { getRetailCategories, listRetailProducts } from "@/server/services/retail-catalog";

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale: StoreLocale = rawLocale === "en" ? "en" : "de";
  const de = locale === "de";
  const categories = await getRetailCategories(locale);
  const category = categories.find((candidate) => candidate.slug === slug);
  if (!category) notFound();
  const result = await listRetailProducts({ locale, categorySlug: slug });
  return <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"><nav className="text-sm text-muted"><Link href={`/${locale}/categories`} className="hover:text-primary">{de ? "Kategorien" : "Categories"}</Link></nav><h1 className="mt-5 font-display text-4xl tracking-[-0.04em] text-primary sm:text-6xl">{category.name}</h1>{category.description ? <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">{category.description}</p> : null}<p className="mt-6 text-sm font-bold text-muted">{result.total} {de ? "Produkte" : "products"}</p>{result.items.length ? <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">{result.items.map((product) => <RetailProductCard key={product.id} product={product} locale={locale} />)}</div> : <div className="mt-8 rounded-card border border-dashed border-border p-10 text-muted">{de ? "In dieser Kategorie sind noch keine veröffentlichten Produkte." : "No published products are available in this category yet."}</div>}</div>;
}
