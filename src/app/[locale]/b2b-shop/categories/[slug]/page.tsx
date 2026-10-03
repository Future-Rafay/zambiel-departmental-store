import Link from "next/link";
import { notFound } from "next/navigation";

import { B2bAccessGate } from "@/components/site/b2b-access-gate";
import { RetailProductCard } from "@/components/site/retail-product-card";
import type { StoreLocale } from "@/config/store";
import { getB2bViewer } from "@/server/services/b2b-access";
import { getB2bCategories, listRetailProducts } from "@/server/services/retail-catalog";

export default async function B2bCategoryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale: StoreLocale = rawLocale === "en" ? "en" : "de";
  const de = locale === "de";
  const viewer = await getB2bViewer();
  if (viewer.status !== "APPROVED") return <B2bAccessGate locale={locale} signedIn={!!viewer.user} status={viewer.status} />;
  const categories = await getB2bCategories(locale);
  const category = categories.find((candidate) => candidate.slug === slug);
  if (!category) notFound();
  const result = await listRetailProducts({ locale, categorySlug: slug, b2b: true });
  return <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"><nav className="text-sm text-muted"><Link href={`/${locale}/b2b-shop`} className="hover:text-primary">{de ? "B2B-Shop" : "B2B Shop"}</Link></nav><h1 className="mt-5 font-display text-4xl text-primary sm:text-6xl">{category.name}</h1>{category.description ? <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">{category.description}</p> : null}<p className="mt-6 text-sm font-bold text-muted">{result.total} {de ? "Produkte" : "products"}</p>{result.items.length ? <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">{result.items.map((product) => <RetailProductCard key={product.id} product={product} locale={locale} hrefBase={`/${locale}/b2b-shop/products`} />)}</div> : <div className="mt-8 border border-dashed border-border p-10 text-muted">{de ? "Keine B2B-Produkte in dieser Kategorie." : "No B2B products are available in this category."}</div>}</div>;
}
