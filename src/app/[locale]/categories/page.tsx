import { CatalogPagination } from "@/components/site/catalog-pagination";
import { CategoryCard } from "@/components/site/category-card";
import { storeConfig, type StoreLocale } from "@/config/store";
import { paginate } from "@/lib/catalog-display";
import { localizedMetadata } from "@/lib/metadata";
import { getRetailCategories } from "@/server/services/retail-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale === "en" ? "en" : "de";
  return localizedMetadata(
    locale,
    "/categories",
    { de: "Kategorien", en: "Categories" },
    {
      de: `Durchsuchen Sie das ${storeConfig.identity.name}-Sortiment nach Kategorie.`,
      en: `Browse the ${storeConfig.identity.name} catalogue by category.`,
    },
  );
}

export default async function CategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const locale: StoreLocale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";
  const { page: requestedPage } = await searchParams;
  // Totals roll up through the whole category tree, so the page is cut after loading it.
  const { items: categories, page, pageCount } = paginate(
    await getRetailCategories(locale),
    Array.isArray(requestedPage) ? requestedPage[0] : requestedPage,
    24,
  );
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary-text">
        {de ? "Sortiment" : "Catalogue"}
      </p>
      <h1 className="mt-2 font-display text-4xl tracking-[-0.04em] text-primary sm:text-6xl">
        {de ? "Kategorien" : "Categories"}
      </h1>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} locale={locale} />
        ))}
      </div>
      <CatalogPagination hrefForPage={(target) => `?page=${target}`} locale={locale} page={page} pageCount={pageCount} />
    </div>
  );
}
