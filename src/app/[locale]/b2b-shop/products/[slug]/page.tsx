import Link from "next/link";
import { notFound } from "next/navigation";

import { B2bAccessGate } from "@/components/site/b2b-access-gate";
import { ProductGallery } from "@/components/site/product-gallery";
import { RetailProductPurchase } from "@/components/site/retail-product-purchase";
import { RetailProductCard } from "@/components/site/retail-product-card";
import type { StoreLocale } from "@/config/store";
import { getB2bViewer } from "@/server/services/b2b-access";
import { getRetailProduct, getRetailRelatedProducts } from "@/server/services/retail-catalog";

export default async function B2bProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale: StoreLocale = rawLocale === "en" ? "en" : "de";
  const de = locale === "de";
  const viewer = await getB2bViewer();
  if (viewer.status !== "APPROVED") return <B2bAccessGate locale={locale} signedIn={!!viewer.user} status={viewer.status} />;
  const product = await getRetailProduct(slug, locale, true);
  if (!product) notFound();
  const related = await getRetailRelatedProducts(product.id, product.category.id, locale, true);
  return <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-16"><nav className="mb-7 text-sm text-muted"><Link href={`/${locale}/b2b-shop`} className="hover:text-primary">{de ? "B2B-Shop" : "B2B Shop"}</Link> / <Link href={`/${locale}/b2b-shop/categories/${product.category.slug}`} className="hover:text-primary">{product.category.name}</Link></nav><div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16"><ProductGallery images={product.media} locale={locale} productName={product.name} /><div className="min-w-0 lg:sticky lg:top-28 lg:self-start"><p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{product.category.name}</p><h1 className="mt-3 font-display text-4xl text-primary sm:text-6xl">{product.name}</h1><div className="mt-8"><RetailProductPurchase locale={locale} productName={product.name} productImage={product.imageUrl} options={product.options} variants={product.variants} /></div></div></div>{product.description ? <section className="mt-16 border-t border-border pt-10"><h2 className="font-display text-3xl text-primary">{de ? "Produktdetails" : "Product details"}</h2><div className="blog-prose mt-6 max-w-4xl" dangerouslySetInnerHTML={{ __html: product.description }} /></section> : null}{related.length ? <section className="mt-16"><h2 className="font-display text-3xl text-primary">{de ? "Weitere B2B-Produkte" : "More B2B products"}</h2><div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">{related.map((item) => <RetailProductCard key={item.id} product={item} locale={locale} hrefBase={`/${locale}/b2b-shop/products`} />)}</div></section> : null}</div>;
}
