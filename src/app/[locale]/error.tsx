"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale === "en" ? "en" : "de";
  const de = locale === "de";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[55vh] max-w-3xl items-center px-5 py-16 sm:px-8">
      <section
        aria-labelledby="route-error-title"
        className="w-full rounded-card border border-border bg-surface p-6 sm:p-10"
      >
        <AlertTriangle aria-hidden="true" className="size-10 text-secondary" />
        <h1
          id="route-error-title"
          className="mt-5 font-display text-3xl text-primary sm:text-4xl"
        >
          {de ? "Diese Seite konnte nicht geladen werden" : "This page could not be loaded"}
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          {de
            ? "Versuchen Sie es erneut. Falls das Problem bestehen bleibt, kehren Sie zum Shop zurück."
            : "Try again. If the problem continues, return to the shop."}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-primary px-5 font-bold text-white hover:bg-primary-light"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {de ? "Erneut versuchen" : "Try again"}
          </button>
          <Link
            href={`/${locale}/products`}
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-border px-5 font-bold text-primary hover:border-primary"
          >
            {de ? "Zum Shop" : "Return to shop"}
          </Link>
        </div>
      </section>
    </main>
  );
}
