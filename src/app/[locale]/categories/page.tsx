import { CategoryCard } from "@/components/site/category-card";
import type { StoreLocale } from "@/config/store";
import { getRetailCategories } from "@/server/services/retail-catalog";

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale: StoreLocale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";
  const categories = await getRetailCategories(locale);
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{de ? "Sortiment" : "Catalogue"}</p>
      <h1 className="mt-2 font-display text-4xl tracking-[-0.04em] text-primary sm:text-6xl">{de ? "Kategorien" : "Categories"}</h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => <CategoryCard key={category.id} category={category} locale={locale} />)}</div>
    </div>
  );
}
