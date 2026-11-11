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
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary-text">
          {de ? "Sortiment" : "Department directory"}
        </p>
        <h1
          id="category-heading"
          className="mt-2 font-display text-4xl tracking-[-0.04em] text-primary sm:text-6xl"
        >
          {de ? "Nach Kategorie einkaufen" : "Shop by category"}
        </h1>
        {catalog.categories.length ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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

      <WhyZambiel locale={locale} />
      <StoryAndRequest locale={locale} />
      <InstagramSpotlight locale={locale} />
      <NewsletterSignup locale={locale} />
    </div>
  );
}
