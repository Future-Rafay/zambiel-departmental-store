import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/site/password-reset-forms";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale === "en" ? "en" : "de";
  return <main className="mx-auto max-w-7xl px-4 py-20"><Card className="mx-auto max-w-md space-y-5"><h1 className="font-display text-3xl font-bold text-primary">{locale === "de" ? "Passwort vergessen" : "Forgot password"}</h1><p className="text-sm text-muted">{locale === "de" ? "Geben Sie Ihre E-Mail-Adresse ein." : "Enter your email address."}</p><ForgotPasswordForm locale={locale} /></Card></main>;
}
