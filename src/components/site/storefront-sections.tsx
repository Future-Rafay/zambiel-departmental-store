import {
  ArrowRight,
  CreditCard,
  Headphones,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { FaInstagram } from "react-icons/fa6";

import { ContactForm } from "@/components/site/contact-form";
import { NewsletterForm } from "@/components/site/newsletter-form";
import {
  RetailProductCard,
  type RetailProductCardData,
} from "@/components/site/retail-product-card";
import type { StoreLocale } from "@/config/store";

export function RetailProductSection({
  id,
  eyebrow,
  title,
  products,
  locale,
}: {
  id: string;
  eyebrow: string;
  title: string;
  products: RetailProductCardData[];
  locale: StoreLocale;
}) {
  if (!products.length) return null;
  return (
    <section
      className="department-rail mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
      aria-labelledby={id}
    >
      <div className="flex items-end justify-between gap-5 border-b border-border pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            {eyebrow}
          </p>
          <h2
            id={id}
            className="mt-2 font-display text-3xl leading-tight tracking-[-0.035em] text-primary sm:text-5xl"
          >
            {title}
          </h2>
        </div>
        <Link
          href={`/${locale}/products`}
          className="hidden min-h-11 items-center gap-2 font-bold text-primary hover:text-secondary sm:inline-flex"
        >
          {locale === "de" ? "Alle ansehen" : "View all"}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {products.map((product) => (
          <RetailProductCard
            key={product.slug}
            product={product}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

export function WhyZambiel({
  locale,
  compact = false,
}: {
  locale: StoreLocale;
  compact?: boolean;
}) {
  const de = locale === "de";
  const items = [
    {
      icon: Truck,
      title: de ? "Lieferung & Logistik" : "Delivery & logistics",
      body: de
        ? "Schnelle und sichere Lieferung direkt zu Ihrer Tür."
        : "Fast and secure delivery, right to your doorstep.",
    },
    {
      icon: PackageCheck,
      title: de ? "Produktqualität" : "Product quality",
      body: de
        ? "Sorgfältig ausgewählte Produkte zu fairen Preisen."
        : "Carefully selected products at fair prices.",
    },
    {
      icon: Headphones,
      title: de ? "Service & Support" : "Service & support",
      body: de
        ? "Freundliche Unterstützung, wenn Sie sie brauchen."
        : "Friendly support whenever you need it.",
    },
    {
      icon: CreditCard,
      title: de ? "Sichere Zahlung" : "Secure payment",
      body: de
        ? "Sicherer Checkout mit passenden Zahlungsoptionen."
        : "Safe checkout with convenient payment options.",
    },
    {
      icon: ShieldCheck,
      title: de ? "Datenschutz" : "Data protection",
      body: de
        ? "Ihre Daten werden sorgfältig und sicher behandelt."
        : "Your information is handled carefully and securely.",
    },
  ];
  return (
    <section
      className={
        compact ? "mt-16" : "mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
      }
      aria-labelledby={compact ? "why-product-heading" : "why-heading"}
    >
      <div className="rounded-card bg-surface-warm p-7 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
          Zambiel
        </p>
        <h2
          id={compact ? "why-product-heading" : "why-heading"}
          className="mt-2 font-display text-3xl tracking-[-0.035em] text-primary sm:text-5xl"
        >
          {de ? "Warum Zambiel?" : "Why choose Zambiel?"}
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          {de
            ? "Ihre Zufriedenheit steht bei uns an erster Stelle."
            : "Your satisfaction is our priority."}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {items.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-card border border-border bg-surface p-5"
            >
              <Icon className="h-6 w-6 text-secondary" aria-hidden="true" />
              <h3 className="mt-4 font-bold text-primary">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InstagramSpotlight({
  locale,
  compact = false,
}: {
  locale: StoreLocale;
  compact?: boolean;
}) {
  const de = locale === "de";
  return (
    <section
      className={
        compact ? "mt-16" : "mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
      }
      aria-labelledby={
        compact ? "instagram-product-heading" : "instagram-heading"
      }
    >
      <div className="flex flex-col gap-6 rounded-card border border-border bg-primary p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div>
          <FaInstagram
            className="h-7 w-7 text-secondary-light"
            aria-hidden="true"
          />
          <h2
            id={compact ? "instagram-product-heading" : "instagram-heading"}
            className="mt-4 font-display text-3xl sm:text-5xl"
          >
            @zambiel.pk
          </h2>
          <p className="mt-3 max-w-2xl text-white/70">
            {de
              ? "Folgen Sie uns für neue Produkte, Ideen und Zambiel-Geschichten."
              : "Follow us for new products, ideas, and stories from Zambiel."}
          </p>
        </div>
        <a
          href="https://www.instagram.com/zambiel.pk/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-control bg-secondary px-6 font-bold text-secondary-foreground hover:bg-secondary-light"
        >
          {de ? "Instagram öffnen" : "Open Instagram"}
        </a>
      </div>
    </section>
  );
}

export function StoryAndRequest({ locale }: { locale: StoreLocale }) {
  const de = locale === "de";
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2">
      <article
        id="about-zambiel"
        className="rounded-card bg-primary p-7 text-white sm:p-10"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary-light">
          Zambiel
        </p>
        <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
          {de
            ? "Wo Einkaufen Geschichten erzählt"
            : "Where Shopping Meets Storytelling"}
        </h2>
        <p className="mt-6 leading-7 text-white/75">
          {de
            ? "Zambiel ist mehr als ein Warenhaus. Wir wählen nützliche, besondere und überraschende Produkte aus und erzählen, wie sie Ihren Alltag bereichern können."
            : "Zambiel is more than a department store. We select useful, distinctive, and surprising products and show how they can add value to everyday life."}
        </p>
        <p className="mt-5 font-bold text-secondary-light">
          {de
            ? "Ihre Produkte. Unsere Auswahl. Mehr Möglichkeiten."
            : "Your products, our selection, more possibilities."}
        </p>
      </article>
      <article className="rounded-card border border-border bg-surface p-7 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
          {de ? "Produkt gesucht" : "Product finder"}
        </p>
        <h2 className="mt-3 font-display text-4xl leading-tight text-primary">
          {de
            ? "Nicht das richtige Produkt gefunden?"
            : "Did not find the product?"}
        </h2>
        <p className="mb-7 mt-4 text-sm leading-6 text-muted">
          {de
            ? "Teilen Sie uns Ihre Anforderungen mit. Wir suchen nach einer passenden Lösung für Sie."
            : "Share your requirements and we will look for a suitable solution for you."}
        </p>
        <ContactForm locale={locale} kind="product_request" />
      </article>
    </section>
  );
}

export function NewsletterSignup({ locale }: { locale: StoreLocale }) {
  const de = locale === "de";
  return (
    <section
      className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
      aria-labelledby="newsletter-heading"
    >
      <div className="rounded-card border border-border bg-surface p-7 sm:p-10">
        <div className="grid gap-6 md:grid-cols-[1fr_0.8fr] md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
              {de ? "Newsletter" : "Newsletter"}
            </p>
            <h2
              id="newsletter-heading"
              className="mt-2 font-display text-3xl text-primary sm:text-5xl"
            >
              {de ? "Unsere E-Mails abonnieren" : "Subscribe to our emails"}
            </h2>
            <p className="mt-3 text-muted">
              {de
                ? "Erfahren Sie zuerst von neuen Kollektionen und exklusiven Angeboten."
                : "Be the first to know about new collections and exclusive offers."}
            </p>
          </div>
          <NewsletterForm locale={locale} />
        </div>
      </div>
    </section>
  );
}
