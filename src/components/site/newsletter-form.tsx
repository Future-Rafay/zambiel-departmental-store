"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function NewsletterForm({ locale }: { locale: "de" | "en" }) {
  const de = locale === "de";
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = event.currentTarget;
    const response = await fetch("/api/v1/public/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), locale }),
    }).catch(() => null);
    if (!response?.ok) return setStatus("error");
    form.reset();
    setStatus("sent");
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="newsletter-email" className="block text-sm font-bold">Email</label>
      <div className="hidden" aria-hidden="true"><label htmlFor="newsletter-website">Website</label><input id="newsletter-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <div className="flex gap-2">
        <input id="newsletter-email" name="email" type="email" autoComplete="email" required className="min-h-12 min-w-0 flex-1 rounded-control border border-border bg-background px-4" />
        <Button type="submit" disabled={status === "sending"}>{status === "sending" ? (de ? "Wird gesendet…" : "Sending…") : (de ? "Abonnieren" : "Subscribe")}</Button>
      </div>
      <p className="text-xs"><Link href={`/${locale}/privacy`} className="inline-flex min-h-11 items-center underline underline-offset-4">{de ? "Datenschutzerklärung" : "Privacy policy"}</Link></p>
      <p role="status" aria-live="polite" className={`text-sm font-semibold ${status === "error" ? "text-destructive" : "text-success"}`}>
        {status === "sent" ? (de ? "Abonniert. Bitte prüfen Sie Ihre E-Mails." : "Subscribed. Please check your email.") : status === "error" ? (de ? "Abonnement fehlgeschlagen. Bitte erneut versuchen." : "Subscription failed. Please try again.") : ""}
      </p>
    </form>
  );
}
