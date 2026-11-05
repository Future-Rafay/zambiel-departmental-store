import Link from "next/link";

import type { StoreLocale } from "@/config/store";

export function CatalogPagination({ hrefForPage, locale, page, pageCount }: { hrefForPage: (page: number) => string; locale: StoreLocale; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const de = locale === "de";
  return (
    <nav aria-label={de ? "Seitennavigation" : "Pagination"} className="mt-10 flex items-center justify-center gap-3">
      <Link aria-disabled={page === 1} href={hrefForPage(Math.max(1, page - 1))} className={`inline-flex min-h-11 items-center rounded-control border border-border px-4 font-bold ${page === 1 ? "pointer-events-none opacity-40" : "hover:border-primary"}`}>{de ? "Zurück" : "Previous"}</Link>
      <span className="text-sm font-bold">{page} / {pageCount}</span>
      <Link aria-disabled={page === pageCount} href={hrefForPage(Math.min(pageCount, page + 1))} className={`inline-flex min-h-11 items-center rounded-control border border-border px-4 font-bold ${page === pageCount ? "pointer-events-none opacity-40" : "hover:border-primary"}`}>{de ? "Weiter" : "Next"}</Link>
    </nav>
  );
}
