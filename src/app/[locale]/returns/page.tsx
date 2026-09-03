import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function ReturnsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-extrabold text-primary">{de ? "Rückgabe & Erstattung" : "Returns & refunds"}</h1>
      <Card className="space-y-4 p-8">
        <h2 className="font-display text-xl font-bold">{de ? "Entwurf – Freigabe ausstehend" : "Draft — approval pending"}</h2>
        <p className="text-sm leading-relaxed text-muted">{de ? "Die Rückgabe- und Erstattungsbedingungen müssen vor der Veröffentlichung vom Betreiber geprüft und freigegeben werden. Diese Seite legt keine Rückgabefristen, Gebühren oder Erstattungsansprüche fest." : "The business owner must review and approve the returns and refunds policy before publication. This page does not establish return periods, fees, or refund entitlements."}</p>
        <Link href={`/${locale}/contact`} className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4">{de ? "Fragen zu einer Bestellung? Kontaktieren Sie uns." : "Questions about an order? Contact us."}</Link>
      </Card>
    </div>
  );
}
