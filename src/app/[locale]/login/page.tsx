import Link from "next/link";
import type { Metadata } from "next";

import { AuthForm } from "@/components/site/auth-form";
import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
      <Card className="mx-auto max-w-md p-8 space-y-6 shadow-xl border-secondary/30">
        <div className="text-center space-y-3">
          <BrandLogo className="mx-auto h-11 w-auto object-contain" />
          <h1 className="font-display text-2xl font-bold text-primary">
            {de ? "Willkommen zurück" : "Welcome back"}
          </h1>
          <p className="text-xs text-muted">
            {de ? "Melden Sie sich an, um Ihre Bestellungen zu verwalten." : "Sign in to manage your orders."}
          </p>
        </div>

        <AuthForm locale={locale} mode="login" />

        <p className="text-center text-xs text-muted border-t border-border/60 pt-4">
          {de ? "Noch kein Konto?" : "No account yet?"}{" "}
          <Link className="font-bold text-primary hover:text-secondary underline" href={`/${locale}/register`}>
            {de ? "Jetzt registrieren" : "Register now"}
          </Link>
        </p>
      </Card>
    </div>
  );
}

