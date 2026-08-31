import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductShare, RecentlyViewedTracker } from "@/components/site/product-client-extras";
import { RetailProductPurchase } from "@/components/site/retail-product-purchase";
import { InstagramSpotlight, RetailProductSection, WhyZambiel } from "@/components/site/storefront-sections";
import { StorefrontImage } from "@/components/site/storefront-image";
import { storeConfig, type StoreLocale } from "@/config/store";
import { parseRecentProducts, RECENT_PRODUCTS_COOKIE } from "@/lib/recent-products";
import {
  getRetailProduct,
  getRetailProductsBySlugs,
  getRetailRelatedProducts,
} from "@/server/services/retail-catalog";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale: StoreLocale = rawLocale === "en" ? "en" : "de";
  const product = await getRetailProduct(slug, locale);
  return product ? { title: product.seoTitle || product.name, description: product.seoDescription || undefined } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale: StoreLocale = rawLocale === "en" ? "en" : "de";
  const de = locale === "de";
  const [product, cookieStore] = await Promise.all([getRetailProduct(slug, locale), cookies()]);
  if (!product) notFound();
  const recentSlugs = parseRecentProducts(cookieStore.get(RECENT_PRODUCTS_COOKIE)?.value).filter((item) => item !== slug).slice(0, 4);
  const [related, recent] = await Promise.all([
    getRetailRelatedProducts(product.id, product.category.id, locale),
    getRetailProductsBySlugs(recentSlugs, locale),
  ]);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.media.map(({ url }) => url).filter(Boolean),
    description: product.seoDescription || undefined,
    sku: product.variants[0]?.sku || undefined,
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      priceCurrency: storeConfig.identity.currency,
      price: (variant.priceRappen / 100).toFixed(2),
      availability: variant.stockAvailable === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    })),
  }).replaceAll("<", "\\u003c");
  const shareUrl = new URL(`/${locale}/products/${slug}`, process.env.APP_URL ?? "http://localhost:3000").href;
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-16">
      <RecentlyViewedTracker slug={slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <nav aria-label={de ? "Brotkrumen" : "Breadcrumb"} className="mb-7 text-sm text-muted"><Link href={`/${locale}/products`} className="hover:text-primary">{de ? "Produkte" : "Products"}</Link><span aria-hidden="true"> / </span><Link href={`/${locale}/categories/${product.category.slug}`} className="hover:text-primary">{product.category.name}</Link></nav>
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>{product.media.length ? <div className="grid grid-cols-2 gap-3"><div className="relative col-span-2 aspect-square overflow-hidden rounded-card border border-border bg-surface"><StorefrontImage src={product.media[0].url} alt={product.media[0].alt} fill className="object-contain p-6" sizes="(max-width: 1024px) 100vw, 50vw" priority /></div>{product.media.slice(1, 5).map((media) => media.url ? <div key={media.id} className="relative aspect-square overflow-hidden rounded-card border border-border bg-surface"><StorefrontImage src={media.url} alt={media.alt} fill className="object-contain p-3" sizes="25vw" /></div> : null)}</div> : <div className="relative aspect-square overflow-hidden rounded-card bg-surface-warm"><StorefrontImage src={null} alt="" fill className="object-contain p-8" /></div>}</div>
        <div className="lg:sticky lg:top-28 lg:self-start"><p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{product.category.name}</p><h1 className="mt-3 font-display text-4xl leading-tight tracking-[-0.045em] text-primary sm:text-6xl">{product.name}</h1><div className="mt-8"><RetailProductPurchase locale={locale} productName={product.name} productImage={product.imageUrl} options={product.options} variants={product.variants} /><ProductShare name={product.name} imageUrl={product.imageUrl} locale={locale} url={shareUrl} /></div></div>
      </div>
      {product.description ? <section className="mt-16 border-t border-border pt-10 sm:mt-24" aria-labelledby="details-heading"><h2 id="details-heading" className="font-display text-3xl text-primary">{de ? "Produktdetails" : "Product details"}</h2><div className="blog-prose mt-6 max-w-4xl" dangerouslySetInnerHTML={{ __html: product.description }} /></section> : null}
      <RetailProductSection id="related-heading" eyebrow={de ? "Das könnte Ihnen gefallen" : "Selected for you"} title={de ? "Das könnte Ihnen auch gefallen" : "You may also like"} products={related} locale={locale} />
      <RetailProductSection id="recent-heading" eyebrow={de ? "Ihr Verlauf" : "Your history"} title={de ? "Kürzlich angesehen" : "Recently viewed"} products={recent} locale={locale} />
      <WhyZambiel locale={locale} compact />
      <InstagramSpotlight locale={locale} compact />
    </div>
  );
}
