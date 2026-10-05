"use client";

import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function LocaleNotFound() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale === "en" ? "en" : "de";
  const de = locale === "de";

  return (
    <main className="mx-auto flex min-h-[55vh] max-w-3xl items-center px-5 py-16 sm:px-8">
      <section
        aria-labelledby="not-found-title"
        className="w-full rounded-card border border-border bg-surface p-6 sm:p-10"
      >
        <PackageSearch aria-hidden="true" className="size-10 text-secondary" />
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
          404
        </p>
        <h1
          id="not-found-title"
          className="mt-2 font-display text-3xl text-primary sm:text-4xl"
        >
          {de ? "Seite nicht gefunden" : "Page not found"}
        </h1>
        <p className="mt-3 text-muted">
          {de
            ? "Der Link ist möglicherweise veraltet oder der Inhalt ist nicht mehr verfügbar."
            : "The link may be outdated or the content may no longer be available."}
        </p>
        <Link
          href={`/${locale}/products`}
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 font-bold text-white hover:bg-primary-light"
        >
          {de ? "Produkte ansehen" : "Browse products"}
        </Link>
      </section>
    </main>
  );
}
