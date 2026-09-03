import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/site/password-reset-forms";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const token = (await searchParams).token?.trim() ?? "";
  return <main className="mx-auto max-w-md px-4 py-20"><Card className="space-y-5"><h1 className="font-display text-3xl font-bold text-primary">{locale === "de" ? "Neues Passwort" : "New password"}</h1>{token ? <ResetPasswordForm locale={locale} token={token} /> : <p role="alert" className="text-destructive">{locale === "de" ? "Dieser Link ist unvollständig." : "This link is incomplete."}</p>}</Card></main>;
}
