import { ArrowRight, PackageCheck } from "lucide-react";
import Link from "next/link";

import type { StoreLocale } from "@/config/store";
import { getRetailCategories } from "@/server/services/retail-catalog";

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale: StoreLocale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";
  const categories = await getRetailCategories(locale);
  return <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"><p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{de ? "Sortiment" : "Catalogue"}</p><h1 className="mt-2 font-display text-4xl tracking-[-0.04em] text-primary sm:text-6xl">{de ? "Kategorien" : "Categories"}</h1><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => <Link key={category.id} href={`/${locale}/categories/${category.slug}`} className="group flex min-h-48 flex-col justify-between rounded-card border border-border bg-surface p-6 hover:border-primary/35 hover:shadow-lg"><PackageCheck className="h-7 w-7 text-secondary" aria-hidden="true" /><div><p className="text-sm text-muted">{category.productCount} {de ? "Produkte" : "products"}</p><h2 className="mt-2 flex items-center justify-between gap-3 text-2xl font-bold text-primary">{category.name}<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" /></h2>{category.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{category.description}</p> : null}</div></Link>)}</div></div>;
}
