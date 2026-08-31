import {
  ArrowRight,
  CreditCard,
  PackageCheck,
  Search,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  RetailProductCard,
  type RetailProductCardData,
} from "@/components/site/retail-product-card";
import { storeConfig, type StoreLocale } from "@/config/store";
import { localizedMetadata } from "@/lib/metadata";
import { formatMoney } from "@/lib/orders";
import { getRetailHomepage } from "@/server/services/retail-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale === "en" ? "en" : "de";
  return localizedMetadata(
    locale,
    "",
    storeConfig.seo.title,
    storeConfig.seo.description,
  );
}

function ProductSection({
  id,
  eyebrow,
  title,
  products,
  locale,
}: {
  id: string;
  eyebrow: string;
  title: string;
  products: RetailProductCardData[];
  locale: StoreLocale;
}) {
  if (!products.length) return null;
  return (
    <section
      className="department-rail mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24"
      aria-labelledby={id}
    >
      <div className="flex items-end justify-between gap-5 border-b border-border pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            {eyebrow}
          </p>
          <h2
            id={id}
            className="mt-2 font-display text-3xl leading-tight tracking-[-0.035em] text-primary sm:text-5xl"
          >
            {title}
          </h2>
        </div>
        <Link
          href={`/${locale}/products`}
          className="hidden min-h-11 items-center gap-2 font-bold text-primary hover:text-secondary sm:inline-flex"
        >
          {locale === "de" ? "Alle ansehen" : "View all"}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {products.map((product) => (
          <RetailProductCard
            key={product.slug}
            product={product}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale: StoreLocale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";
  const catalog = await getRetailHomepage(locale);
  const heroProducts = catalog.featured
    .filter((product) => product.imageUrl)
    .slice(0, 4);
  return (
    <div className="overflow-hidden pb-16">

      <section className="relative border-b border-border bg-primary text-white">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="px-5 py-16 sm:px-8 sm:py-24 lg:py-28">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary-light">
              {de ? "Schweizer Warenhaus" : "Swiss department store"}
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[0.96] tracking-[-0.055em] sm:text-7xl">
              {storeConfig.identity.tagline[locale]}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
              {storeConfig.identity.description[locale]}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/products`}
                className="inline-flex min-h-12 items-center gap-2 rounded-control bg-secondary px-6 font-bold text-secondary-foreground hover:bg-secondary-light"
              >
                {de ? "Produkte entdecken" : "Explore products"}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href={`/${locale}/categories`}
                className="inline-flex min-h-12 items-center rounded-control border border-white/30 px-6 font-bold text-white hover:bg-white/10"
              >
                {de ? "Kategorien" : "Categories"}
              </Link>
            </div>
            <form
              action={`/${locale}/products`}
              role="search"
              className="mt-10 max-w-2xl border-t border-white/20 pt-6"
            >
              <label
                htmlFor="hero-search"
                className="mb-3 block text-sm font-bold"
              >
                {de ? "Was suchen Sie?" : "What are you looking for?"}
              </label>
              <div className="flex gap-2">
                <input
                  id="hero-search"
                  name="q"
                  type="search"
                  className="min-h-12 min-w-0 flex-1 rounded-control border border-white/20 bg-white px-4 text-foreground"
                  placeholder={de ? "Produkt oder SKU" : "Product or SKU"}
                />
                <button
                  className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-control bg-secondary text-secondary-foreground hover:bg-secondary-light"
                  aria-label={de ? "Suchen" : "Search"}
                >
                  <Search className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
          {heroProducts.length ? (
            <div className="grid min-h-[22rem] grid-cols-2 gap-px bg-white/15 lg:min-h-full">
              <Link
                href={`/${locale}/products/${heroProducts[0].slug}`}
                className="group relative col-span-2 overflow-hidden sm:col-span-1 sm:row-span-1"
              >
                <Image
                  src={heroProducts[0].imageUrl!}
                  alt={heroProducts[0].name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 24vw, 50vw"
                  className="object-contain transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                />
                {/* <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/90 to-transparent p-5 pt-14 font-bold">
                  {heroProducts[0].name}
                </span> */}
              </Link>
              {heroProducts.slice(1).map((product) => (
                <Link
                  key={product.slug}
                  href={`/${locale}/products/${product.slug}`}
                  className="group relative min-h-44 overflow-hidden"
                >
                  <Image
                    src={product.imageUrl!}
                    alt={product.name}
                    fill
                    sizes="(min-width: 1024px) 24vw, 50vw"
                    className="object-contain transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                  />
                  {/* <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/90 to-transparent p-4 pt-12 text-sm font-bold">
                    {product.name}
                  </span> */}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24"
        aria-labelledby="category-heading"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
          {de ? "Sortiment" : "Department directory"}
        </p>
        <h2
          id="category-heading"
          className="mt-2 font-display text-3xl tracking-[-0.035em] text-primary sm:text-5xl"
        >
          {de ? "Nach Kategorie einkaufen" : "Shop by category"}
        </h2>
        {catalog.categories.length ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.categories.map((category) => (
              <Link
                key={category.id}
                href={`/${locale}/categories/${category.slug}`}
                className="group flex min-h-36 flex-col justify-between rounded-card border border-border bg-surface p-6 hover:border-primary/35 hover:shadow-lg"
              >
                <PackageCheck
                  className="h-7 w-7 text-secondary"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="mt-8 text-xl font-bold text-primary">
                    {category.name}
                  </h3>
                  {/* <p className="mt-1 text-sm text-muted">
                    {category.productCount} {de ? "Produkte" : "products"}
                  </p> */}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-card border border-dashed border-border p-8 text-muted">
            {de
              ? "Kategorien erscheinen nach der Katalogprüfung."
              : "Categories will appear after catalogue review."}
          </div>
        )}
      </section>

      <ProductSection
        id="featured-heading"
        eyebrow={de ? "Ausgewählt" : "Selected"}
        title={de ? "Empfohlene Produkte" : "Featured products"}
        products={catalog.featured}
        locale={locale}
      />
      <ProductSection
        id="bestseller-heading"
        eyebrow={de ? "Häufig bestellt" : "Frequently ordered"}
        title={de ? "Bestseller" : "Best sellers"}
        products={catalog.bestSellers}
        locale={locale}
      />
      <ProductSection
        id="new-heading"
        eyebrow={de ? "Neu im Sortiment" : "Recently added"}
        title={de ? "Neuheiten" : "New arrivals"}
        products={catalog.newest}
        locale={locale}
      />

      {catalog.promotions.length ? (
        <section
          className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24"
          aria-labelledby="promotions-heading"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            {de ? "Aktuelle Angebote" : "Current offers"}
          </p>
          <h2
            id="promotions-heading"
            className="mt-2 font-display text-3xl tracking-[-0.035em] text-primary sm:text-5xl"
          >
            {de ? "Promotionen" : "Promotions"}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {catalog.promotions.map((promotion) => (
              <article
                key={promotion.id}
                className="rounded-card border border-border bg-primary p-6 text-white"
              >
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-secondary-light">
                  {promotion.code}
                </p>
                <p className="mt-3 font-display text-3xl">
                  {promotion.type === "PERCENT"
                    ? `${promotion.value / 100}%`
                    : formatMoney(promotion.value, locale)}{" "}
                  {de ? "Rabatt" : "off"}
                </p>
                {promotion.minimumSubtotalRappen > 0 ? (
                  <p className="mt-2 text-sm text-white/70">
                    {de ? "Ab" : "From"}{" "}
                    {formatMoney(promotion.minimumSubtotalRappen, locale)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section
        className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24"
        aria-labelledby="why-heading"
      >
        <div className="rounded-3xl bg-surface-warm p-7 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            Zambiel
          </p>
          <h2
            id="why-heading"
            className="mt-2 font-display text-3xl tracking-[-0.035em] text-primary sm:text-5xl"
          >
            {de ? "Einfach einkaufen" : "Shopping made clear"}
          </h2>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: PackageCheck,
                de: "Aktueller Bestand",
                en: "Live availability",
                bodyDe:
                  "Nicht verfügbare Varianten können nicht bestellt werden.",
                bodyEn: "Unavailable variants cannot be ordered.",
              },
              {
                icon: Truck,
                de: "Lieferung oder Abholung",
                en: "Delivery or pickup",
                bodyDe: "Die Verfügbarkeit wird serverseitig geprüft.",
                bodyEn: "Eligibility is checked on the server.",
              },
              {
                icon: CreditCard,
                de: "Sichere Zahlung",
                en: "Secure payment",
                bodyDe: "Stripe und passende Barzahlungsarten.",
                bodyEn: "Stripe and the appropriate cash payment methods.",
              },
            ].map((item) => (
              <article
                key={item.en}
                className="rounded-card border border-border bg-surface p-6"
              >
                <item.icon
                  className="h-7 w-7 text-secondary"
                  aria-hidden="true"
                />
                <h3 className="mt-5 text-lg font-bold text-primary">
                  {de ? item.de : item.en}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {de ? item.bodyDe : item.bodyEn}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
