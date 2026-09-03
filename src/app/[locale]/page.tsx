import { CategoryCard } from "@/components/site/category-card";
import { HeroShowcase } from "@/components/site/hero-showcase";
import {
  InstagramSpotlight,
  NewsletterSignup,
  RetailProductSection,
  StoryAndRequest,
  WhyZambiel,
} from "@/components/site/storefront-sections";
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

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale: StoreLocale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";
  const catalog = await getRetailHomepage(locale);
  return (
    <div className="overflow-hidden pb-12">
      <HeroShowcase products={catalog.showcase} locale={locale} />

      <section
        className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
        aria-labelledby="category-heading"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
          {de ? "Sortiment" : "Department directory"}
        </p>
        <h1
          id="category-heading"
          className="mt-2 font-display text-4xl tracking-[-0.04em] text-primary sm:text-6xl"
        >
          {de ? "Nach Kategorie einkaufen" : "Shop by category"}
        </h1>
        {catalog.categories.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {catalog.categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                locale={locale}
              />
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

      <RetailProductSection
        id="featured-heading"
        eyebrow={de ? "Ausgewählt" : "Selected"}
        title={de ? "Empfohlene Produkte" : "Featured products"}
        products={catalog.featured}
        locale={locale}
      />
      <RetailProductSection
        id="bestseller-heading"
        eyebrow={de ? "Häufig bestellt" : "Frequently ordered"}
        title={de ? "Bestseller" : "Best sellers"}
        products={catalog.bestSellers}
        locale={locale}
      />
      <RetailProductSection
        id="new-heading"
        eyebrow={de ? "Neu im Sortiment" : "Recently added"}
        title={de ? "Neuheiten" : "New arrivals"}
        products={catalog.newest}
        locale={locale}
      />

      {catalog.promotions.length ? (
        <section
          className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
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

      <WhyZambiel locale={locale} />
      <StoryAndRequest locale={locale} />
      <InstagramSpotlight locale={locale} />
      <NewsletterSignup locale={locale} />
    </div>
  );
}
