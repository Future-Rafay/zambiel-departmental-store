import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function MarketingUnsubscribePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string; done?: string; invalid?: string }> }) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const query = await searchParams;
  const de = locale === "de";
  const token = query.token?.trim() ?? "";
  return (
    <main className="mx-auto max-w-7xl px-4 py-20">
      <Card className="mx-auto max-w-xl">
        <h1 className="mb-4 font-display text-3xl font-bold text-primary">{de ? "Marketing-E-Mails abbestellen" : "Unsubscribe from marketing emails"}</h1>
        {query.done ? <p role="status" className="font-semibold text-success">{de ? "Sie erhalten keine Marketing-E-Mails mehr." : "You will no longer receive marketing emails."}</p>
          : query.invalid || !token ? <p role="alert" className="text-destructive">{de ? "Dieser Link ist ungültig oder unvollständig." : "This link is invalid or incomplete."}</p>
          : <form method="post" action="/api/v1/public/marketing/unsubscribe" className="space-y-4">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="locale" value={locale} />
              <p>{de ? "Möchten Sie keine Marketing-E-Mails mehr erhalten? Bestell- und Kontoinformationen erhalten Sie weiterhin." : "Stop receiving marketing emails? You will still receive order and account emails."}</p>
              <Button type="submit" variant="destructive">{de ? "Abbestellen" : "Unsubscribe"}</Button>
            </form>}
      </Card>
    </main>
  );
}