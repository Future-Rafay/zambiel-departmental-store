import Link from "next/link";
import type { Metadata } from "next";

import { AuthForm } from "@/components/site/auth-form";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function RegisterPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ b2b?: string }> }) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";
  const requestB2b = (await searchParams).b2b === "1";

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
      <Card className="mx-auto max-w-md p-8 space-y-6 shadow-xl border-secondary/30">
        <div className="text-center space-y-3">
          <BrandLogo className="mx-auto h-11 w-auto object-contain" />
          <h1 className="font-display text-2xl font-bold text-primary">
            {requestB2b ? (de ? "B2B-Konto beantragen" : "Register for B2B access") : (de ? "Konto erstellen" : "Create account")}
          </h1>
          <p className="text-xs text-muted">
            {requestB2b ? (de ? "Erstellen Sie ein Konto. Ihre B2B-Anfrage wird anschließend geprüft." : "Create an account and your B2B request will be reviewed.") : (de ? "Erstellen Sie ein Konto für schnellere Bestellungen." : "Create an account for faster ordering.")}
          </p>
        </div>

        <AuthForm locale={locale} mode="register" requestB2b={requestB2b} />

        <p className="text-center text-xs text-muted border-t border-border/60 pt-4">
          {de ? "Bereits ein Konto?" : "Already have an account?"}{" "}
          <Link className="font-bold text-primary hover:text-secondary underline" href={`/${locale}/login`}>
            {de ? "Zur Anmeldung" : "Back to sign in"}
          </Link>
        </p>
      </Card>
    </div>
  );
}

