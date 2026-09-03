import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ProductShare,
  RecentlyViewedTracker,
} from "@/components/site/product-client-extras";
import { ProductGallery } from "@/components/site/product-gallery";
import { RetailProductPurchase } from "@/components/site/retail-product-purchase";
import {
  InstagramSpotlight,
  RetailProductSection,
  WhyZambiel,
} from "@/components/site/storefront-sections";
import { storeConfig, type StoreLocale } from "@/config/store";
import {
  parseRecentProducts,
  RECENT_PRODUCTS_COOKIE,
} from "@/lib/recent-products";
import {
  getRetailProduct,
  getRetailProductsBySlugs,
  getRetailRelatedProducts,
} from "@/server/services/retail-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: StoreLocale = rawLocale === "en" ? "en" : "de";
  const product = await getRetailProduct(slug, locale);
  return product
    ? {
        title: product.seoTitle || product.name,
        description: product.seoDescription || undefined,
      }
    : {};
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale: StoreLocale = rawLocale === "en" ? "en" : "de";
  const de = locale === "de";
  const [product, cookieStore] = await Promise.all([
    getRetailProduct(slug, locale),
    cookies(),
  ]);
  if (!product) notFound();
  const recentSlugs = parseRecentProducts(
    cookieStore.get(RECENT_PRODUCTS_COOKIE)?.value,
  )
    .filter((item) => item !== slug)
    .slice(0, 4);
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
      availability:
        variant.stockAvailable === 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    })),
  }).replaceAll("<", "\\u003c");
  const shareUrl = new URL(
    `/${locale}/products/${slug}`,
    process.env.APP_URL ?? "http://localhost:3000",
  ).href;
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-16">
      <RecentlyViewedTracker slug={slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <nav
        aria-label={de ? "Brotkrumen" : "Breadcrumb"}
        className="mb-7 text-sm text-muted"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href={`/${locale}`} className="hover:text-primary">
              {de ? "Startseite" : "Home"}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${locale}/products`} className="hover:text-primary">
              {de ? "Produkte" : "Products"}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/${locale}/categories/${product.category.slug}`}
              className="hover:text-primary"
            >
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li
            aria-current="page"
            className="max-w-full truncate font-semibold text-foreground"
          >
            {product.name}
          </li>
        </ol>
      </nav>
      <div className="grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <ProductGallery
          images={product.media}
          locale={locale}
          productName={product.name}
        />
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            {product.category.name}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight tracking-[-0.045em] text-primary sm:text-6xl">
            {product.name}
          </h1>
          <div className="mt-8">
            <RetailProductPurchase
              locale={locale}
              productName={product.name}
              productImage={product.imageUrl}
              options={product.options}
              variants={product.variants}
            />
            <ProductShare name={product.name} locale={locale} url={shareUrl} />
          </div>
        </div>
      </div>
      {product.description ? (
        <section
          className="mt-16 border-t border-border pt-10 sm:mt-24"
          aria-labelledby="details-heading"
        >
          <h2
            id="details-heading"
            className="font-display text-3xl text-primary"
          >
            {de ? "Produktdetails" : "Product details"}
          </h2>
          <div
            className="blog-prose mt-6 max-w-4xl"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </section>
      ) : null}
      <RetailProductSection
        id="related-heading"
        eyebrow={de ? "Das könnte Ihnen gefallen" : "Selected for you"}
        title={de ? "Das könnte Ihnen auch gefallen" : "You may also like"}
        products={related}
        locale={locale}
      />
      <RetailProductSection
        id="recent-heading"
        eyebrow={de ? "Ihr Verlauf" : "Your history"}
        title={de ? "Kürzlich angesehen" : "Recently viewed"}
        products={recent}
        locale={locale}
      />
      <WhyZambiel locale={locale} compact />
      <InstagramSpotlight locale={locale} compact />
    </div>
  );
}
