"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function B2bAccessGate({ locale, signedIn, status }: { locale: "de" | "en"; signedIn: boolean; status: string }) {
  const de = locale === "de";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function requestAccess() {
    setBusy(true);
    setError(false);
    const response = await fetch("/api/v1/customer/b2b-access-request", { method: "POST" });
    if (!response.ok) { setError(true); setBusy(false); return; }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
      <Card className="mx-auto max-w-2xl rounded-none border-secondary/40 p-8 text-center sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Zambiel B2B</p>
        <h1 className="mt-3 font-display text-4xl text-primary">{de ? "Geschäftskundenzugang" : "Business access"}</h1>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-muted">
          {status === "PENDING"
            ? (de ? "Ihre Anfrage wird geprüft. Wir informieren Sie, sobald Ihr Zugang freigegeben wurde." : "Your request is under review. We will let you know when access is approved.")
            : (de ? "Unser B2B-Sortiment ist für freigegebene Geschäftskunden verfügbar." : "Our B2B catalog is available to approved business customers.")}
        </p>
        {!signedIn ? (
          <Link href={`/${locale}/register?b2b=1`} className="mt-7 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-6 py-2.5 font-semibold text-primary-foreground">
            {de ? "B2B-Konto beantragen" : "Register for B2B access"}
          </Link>
        ) : status !== "PENDING" ? (
          <Button className="mt-7" onClick={requestAccess} disabled={busy}>
            {busy ? (de ? "Wird gesendet…" : "Sending…") : (de ? "B2B-Zugang beantragen" : "Request B2B Access")}
          </Button>
        ) : null}
        {error ? <p role="alert" className="mt-4 text-sm font-semibold text-destructive">{de ? "Die Anfrage konnte nicht gesendet werden." : "The request could not be sent."}</p> : null}
      </Card>
    </div>
  );
}
