"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function NewsletterUnsubscribeForm({ token, locale }: { token: string; locale: "de" | "en" }) {
  const de = locale === "de";
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  async function unsubscribe() {
    setStatus("working");
    const response = await fetch("/api/v1/public/newsletter/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    setStatus(response?.ok ? "done" : "error");
  }
  if (status === "done") return <p role="status" className="font-semibold text-success">{de ? "Sie wurden abgemeldet." : "You have been unsubscribed."}</p>;
  return <div className="space-y-4"><p>{de ? "Möchten Sie keine Newsletter mehr erhalten?" : "Do you want to stop receiving newsletter emails?"}</p><Button type="button" variant="destructive" onClick={unsubscribe} disabled={status === "working"}>{status === "working" ? (de ? "Wird abgemeldet…" : "Unsubscribing…") : (de ? "Newsletter abbestellen" : "Unsubscribe")}</Button>{status === "error" ? <p role="alert" className="text-sm text-destructive">{de ? "Der Link ist ungültig oder abgelaufen." : "This link is invalid or expired."}</p> : null}</div>;
}
