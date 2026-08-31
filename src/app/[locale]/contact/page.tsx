import { Mail, MessageCircle } from "lucide-react";
import { FaInstagram } from "react-icons/fa6";

import { ContactForm } from "@/components/site/contact-form";
import { storeConfig, type StoreLocale } from "@/config/store";
import { localizedMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return localizedMetadata(
    (await params).locale,
    "/contact",
    { de: "Kontakt", en: "Contact" },
    {
      de: "Kontaktieren Sie Zambiel bei Fragen zu Produkten und Bestellungen.",
      en: "Contact Zambiel with product and order questions.",
    },
  );
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale: StoreLocale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-20">
      <section className="max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Zambiel</p>
        <h1 className="mt-3 font-display text-5xl leading-tight tracking-[-0.05em] text-primary sm:text-7xl">
          {de ? "Wie können wir helfen?" : "How can we help?"}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
          {de
            ? "Fragen zu einem Produkt oder einer Bestellung? Schreiben Sie uns – wir antworten per E-Mail."
            : "Questions about a product or order? Send us a message and we will reply by email."}
        </p>
      </section>

      <div className="mt-12 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <aside className="space-y-4">
          <a href={`mailto:${storeConfig.contact.email}`} className="block rounded-card border border-border bg-surface p-6 hover:border-secondary">
            <Mail className="h-6 w-6 text-secondary" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold text-primary">Email</h2>
            <p className="mt-2 break-all text-sm text-muted">{storeConfig.contact.email}</p>
          </a>
          <a href={storeConfig.contact.social.instagram!} target="_blank" rel="noreferrer" className="block rounded-card border border-border bg-surface p-6 hover:border-secondary">
            <FaInstagram className="h-6 w-6 text-secondary" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold text-primary">Instagram</h2>
            <p className="mt-2 text-sm text-muted">@zambiel.pk</p>
          </a>
          <div className="rounded-card border border-dashed border-white/20 bg-primary p-6 text-white">
            <MessageCircle className="h-6 w-6 text-secondary-light" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold">{de ? "Live-Chat" : "Live chat"}</h2>
            <p className="mt-2 text-sm text-white/70">{de ? "Demnächst verfügbar" : "Coming soon"}</p>
          </div>
        </aside>
        <section className="rounded-card border border-border bg-surface p-6 sm:p-10" aria-labelledby="contact-form-heading">
          <h2 id="contact-form-heading" className="font-display text-3xl tracking-[-0.03em] text-primary">
            {de ? "Nachricht senden" : "Send a message"}
          </h2>
          <p className="mb-7 mt-3 text-sm leading-6 text-muted">
            {de ? "Pflichtfelder helfen uns, Ihnen direkt zu antworten." : "Required fields help us reply directly."}
          </p>
          <ContactForm locale={locale} />
        </section>
      </div>
    </div>
  );
}
