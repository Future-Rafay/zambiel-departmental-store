import { Filter, Search } from "lucide-react";
import Link from "next/link";

import { RetailProductCard } from "@/components/site/retail-product-card";
import type { StoreLocale } from "@/config/store";
import {
  getRetailCategories,
  getRetailOptionFacets,
  listRetailProducts,
} from "@/server/services/retail-catalog";

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
const many = (value: string | string[] | undefined) =>
  value ? (Array.isArray(value) ? value : [value]) : [];

function Filters({
  locale,
  categories,
  facets,
  values,
}: {
  locale: StoreLocale;
  categories: Awaited<ReturnType<typeof getRetailCategories>>;
  facets: Awaited<ReturnType<typeof getRetailOptionFacets>>;
  values: Params;
}) {
  const de = locale === "de";
  return (
    <form action={`/${locale}/products`} className="space-y-5">
      <div>
        <label htmlFor="catalog-query" className="mb-2 block text-sm font-bold">
          {de ? "Suche" : "Search"}
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            id="catalog-query"
            name="q"
            defaultValue={one(values.q)}
            className="min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="catalog-category"
          className="mb-2 block text-sm font-bold"
        >
          {de ? "Kategorie" : "Category"}
        </label>
        <select
          id="catalog-category"
          name="category"
          defaultValue={one(values.category) ?? ""}
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-3"
        >
          <option value="">{de ? "Alle Kategorien" : "All categories"}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="min-price" className="mb-2 block text-sm font-bold">
            {de ? "Min. CHF" : "Min CHF"}
          </label>
          <input
            id="min-price"
            name="min"
            type="number"
            min="0"
            step="0.05"
            defaultValue={one(values.min)}
            className="min-h-11 w-full rounded-xl border border-border bg-surface px-3"
          />
        </div>
        <div>
          <label htmlFor="max-price" className="mb-2 block text-sm font-bold">
            {de ? "Max. CHF" : "Max CHF"}
          </label>
          <input
            id="max-price"
            name="max"
            type="number"
            min="0"
            step="0.05"
            defaultValue={one(values.max)}
            className="min-h-11 w-full rounded-xl border border-border bg-surface px-3"
          />
        </div>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
        <input
          type="checkbox"
          name="available"
          value="1"
          defaultChecked={one(values.available) === "1"}
          className="h-5 w-5 rounded border-border accent-primary"
        />
        {de ? "Nur verfügbar" : "Available only"}
      </label>
      {facets
        .filter(({ values: options }) => options.length > 0)
        .map((facet) => (
          <fieldset key={facet.id} className="space-y-2">
            <legend className="text-sm font-bold">{facet.name}</legend>
            {facet.values.map((value) => {
              const key = `${facet.id}:${value.id}`;
              return (
                <label
                  key={value.id}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    name="option"
                    value={key}
                    defaultChecked={many(values.option).includes(key)}
                    className="h-5 w-5 rounded border-border accent-primary"
                  />
                  {value.value}
                </label>
              );
            })}
          </fieldset>
        ))}
      <div>
        <label htmlFor="catalog-sort" className="mb-2 block text-sm font-bold">
          {de ? "Sortierung" : "Sort"}
        </label>
        <select
          id="catalog-sort"
          name="sort"
          defaultValue={one(values.sort) ?? "featured"}
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-3"
        >
          <option value="featured">{de ? "Empfohlen" : "Featured"}</option>
          <option value="newest">{de ? "Neueste" : "Newest"}</option>
          <option value="price-asc">
            {de ? "Preis aufsteigend" : "Price low to high"}
          </option>
          <option value="price-desc">
            {de ? "Preis absteigend" : "Price high to low"}
          </option>
          <option value="name">{de ? "Name" : "Name"}</option>
        </select>
      </div>
      <button className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-5 font-bold text-white">
        {de ? "Anwenden" : "Apply"}
      </button>
    </form>
  );
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Params>;
}) {
  const locale: StoreLocale = (await params).locale === "en" ? "en" : "de";
  const values = await searchParams;
  const de = locale === "de";
  const min = Number(one(values.min));
  const max = Number(one(values.max));
  const sortValue = one(values.sort);
  const sort = [
    "featured",
    "newest",
    "price-asc",
    "price-desc",
    "name",
  ].includes(sortValue ?? "")
    ? (sortValue as "featured" | "newest" | "price-asc" | "price-desc" | "name")
    : "featured";
  const options = many(values.option).flatMap((value) => {
    const [optionId, valueId, extra] = value.split(":");
    return optionId && valueId && !extra ? [{ optionId, valueId }] : [];
  });
  const [categories, facets, result] = await Promise.all([
    getRetailCategories(locale),
    getRetailOptionFacets(),
    listRetailProducts({
      locale,
      categorySlug: one(values.category),
      query: one(values.q),
      tag: one(values.tag),
      options,
      minPriceRappen:
        Number.isFinite(min) && min >= 0 ? Math.round(min * 100) : undefined,
      maxPriceRappen:
        Number.isFinite(max) && max >= 0 ? Math.round(max * 100) : undefined,
      availableOnly: one(values.available) === "1",
      sort,
      page: Number(one(values.page)) || 1,
    }),
  ]);
  const queryForPage = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (key === "page") continue;
      for (const current of many(value))
        if (current) query.append(key, current);
    }
    query.set("page", String(page));
    return `?${query}`;
  };
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            {de ? "Sortiment" : "Catalogue"}
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-[-0.04em] text-primary sm:text-6xl">
            {de ? "Alle Produkte" : "All products"}
          </h1>
        </div>
        <p className="text-sm font-bold text-muted">
          {result.total} {de ? "Produkte" : "products"}
        </p>
      </div>
      <details className="mt-6 rounded-card border border-border bg-surface p-4 md:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold">
          <Filter className="h-5 w-5 text-secondary" aria-hidden="true" />
          {de ? "Filter und Sortierung" : "Filters and sorting"}
        </summary>
        <div className="mt-5">
          <Filters
            locale={locale}
            categories={categories}
            facets={facets}
            values={values}
          />
        </div>
      </details>
      <div className="mt-8 grid gap-8 md:grid-cols-[16rem_1fr]">
        <aside className="hidden self-start rounded-card border border-border bg-surface p-5 md:block">
          <Filters
            locale={locale}
            categories={categories}
            facets={facets}
            values={values}
          />
        </aside>
        <div>
          {result.items.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
              {result.items.map((product) => (
                <RetailProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-card border border-dashed border-border p-10 text-center text-muted">
              {de
                ? "Keine passenden Produkte gefunden."
                : "No matching products found."}
            </div>
          )}
          {result.pageCount > 1 ? (
            <nav
              aria-label={de ? "Seitennavigation" : "Pagination"}
              className="mt-10 flex items-center justify-center gap-3"
            >
              <Link
                aria-disabled={result.page === 1}
                href={queryForPage(Math.max(1, result.page - 1))}
                className={`inline-flex min-h-11 items-center rounded-xl border border-border px-4 font-bold ${result.page === 1 ? "pointer-events-none opacity-40" : "hover:border-primary"}`}
              >
                {de ? "Zurück" : "Previous"}
              </Link>
              <span className="text-sm font-bold">
                {result.page} / {result.pageCount}
              </span>
              <Link
                aria-disabled={result.page === result.pageCount}
                href={queryForPage(Math.min(result.pageCount, result.page + 1))}
                className={`inline-flex min-h-11 items-center rounded-xl border border-border px-4 font-bold ${result.page === result.pageCount ? "pointer-events-none opacity-40" : "hover:border-primary"}`}
              >
                {de ? "Weiter" : "Next"}
              </Link>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
