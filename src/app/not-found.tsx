import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-16">
      <section aria-labelledby="root-not-found-title" className="w-full rounded-card border border-border bg-surface p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">404</p>
        <h1 id="root-not-found-title" className="mt-2 font-display text-3xl text-primary">
          Seite nicht gefunden / Page not found
        </h1>
        <Link href="/de" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 font-bold text-white hover:bg-primary-light">
          Zur Startseite / Go home
        </Link>
      </section>
    </main>
  );
}
