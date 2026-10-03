import Link from "next/link";

import { B2bAccessGate } from "@/components/site/b2b-access-gate";
import { RetailProductCard } from "@/components/site/retail-product-card";
import type { StoreLocale } from "@/config/store";
import { getB2bViewer } from "@/server/services/b2b-access";
import { getB2bCategories, listRetailProducts } from "@/server/services/retail-catalog";

export default async function B2bShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale: StoreLocale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";
  const viewer = await getB2bViewer();
  if (viewer.status !== "APPROVED") return <B2bAccessGate locale={locale} signedIn={!!viewer.user} status={viewer.status} />;
  const [categories, products] = await Promise.all([getB2bCategories(locale), listRetailProducts({ locale, b2b: true })]);
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Zambiel B2B</p>
      <h1 className="mt-3 font-display text-4xl text-primary sm:text-6xl">{de ? "B2B-Shop" : "B2B Shop"}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">{de ? "Produkte und Bestelloptionen für freigegebene Geschäftskunden." : "Products and ordering options for approved business customers."}</p>
      {categories.length ? <div className="mt-10 flex flex-wrap gap-3">{categories.filter(({ parentId }) => !parentId).map((category) => <Link key={category.id} href={`/${locale}/b2b-shop/categories/${category.slug}`} className="inline-flex min-h-11 items-center rounded-control border border-border bg-surface px-5 font-semibold text-primary hover:border-primary">{category.name}</Link>)}</div> : null}
      {products.items.length ? <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">{products.items.map((product) => <RetailProductCard key={product.id} product={product} locale={locale} hrefBase={`/${locale}/b2b-shop/products`} />)}</div> : <p className="mt-10 border border-dashed border-border p-10 text-muted">{de ? "Noch keine B2B-Produkte verfügbar." : "No B2B products are available yet."}</p>}
    </div>
  );
}
