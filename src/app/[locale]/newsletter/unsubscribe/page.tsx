import type { Metadata } from "next";

import { NewsletterUnsubscribeForm } from "@/components/site/newsletter-unsubscribe-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewsletterUnsubscribePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const token = (await searchParams).token?.trim() ?? "";
  return <main className="mx-auto max-w-7xl px-4 py-20"><Card className="mx-auto max-w-xl"><h1 className="mb-4 font-display text-3xl font-bold text-primary">{locale === "de" ? "Newsletter abbestellen" : "Unsubscribe from newsletter"}</h1>{token ? <NewsletterUnsubscribeForm token={token} locale={locale} /> : <p role="alert" className="text-destructive">{locale === "de" ? "Dieser Link ist unvollständig." : "This link is incomplete."}</p>}</Card></main>;
}
