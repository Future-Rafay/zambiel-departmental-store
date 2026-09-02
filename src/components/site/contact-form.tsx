"use client";

import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ContactForm({
  locale,
  kind = "contact",
}: {
  locale: "de" | "en";
  kind?: "contact" | "product_request";
}) {
  const de = locale === "de";
  const request = kind === "product_request";
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorCode, setErrorCode] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorCode("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/v1/public/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, kind, locale }),
    }).catch(() => null);
    if (!response?.ok) {
      const body = await response?.json().catch(() => null);
      setErrorCode(typeof body?.error === "string" ? body.error : "");
      setStatus("error");
      return;
    }
    form.reset();
    setStatus("sent");
  }

  const prefix = request ? "request" : "contact";
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-name`}>{de ? "Name" : "Name"}</Label>
        <Input id={`${prefix}-name`} name="name" autoComplete="name" required minLength={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-email`}>Email</Label>
        <Input id={`${prefix}-email`} name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-phone`}>{de ? "Telefon (optional)" : "Phone (optional)"}</Label>
        <Input id={`${prefix}-phone`} name="phone" type="tel" autoComplete="tel" />
      </div>
      {request ? null : (
        <div className="space-y-2">
          <Label htmlFor="contact-subject">{de ? "Betreff" : "Subject"}</Label>
          <Input id="contact-subject" name="subject" maxLength={160} />
        </div>
      )}
      <div className="hidden" aria-hidden="true">
        <Label htmlFor={`${prefix}-website`}>Website</Label>
        <Input id={`${prefix}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${prefix}-message`}>
          {request
            ? de ? "Ihre Anforderung" : "Your requirement"
            : de ? "Nachricht" : "Message"}
        </Label>
        <textarea
          id={`${prefix}-message`}
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={request ? 5 : 7}
          className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 text-base focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>
      <div className="flex flex-col items-start gap-3 sm:col-span-2 sm:flex-row sm:items-center">
        <Button type="submit" disabled={status === "sending"}>
          <Send aria-hidden="true" className="size-4" />
          {status === "sending"
            ? de ? "Wird gesendet…" : "Sending…"
            : request
              ? de ? "Anforderung senden" : "Send requirement"
              : de ? "Nachricht senden" : "Send message"}
        </Button>
        <p
          role="status"
          aria-live="polite"
          className={`text-sm font-semibold ${status === "error" ? "text-destructive" : "text-success"}`}
        >
          {status === "sent"
            ? de ? "Nachricht gesendet. Wir melden uns bald." : "Message sent. We will reply soon."
            : status === "error"
              ? errorCode === "RATE_LIMITED"
                ? de ? "Zu viele Anfragen. Bitte versuchen Sie es später erneut." : "Too many requests. Please try again later."
                : errorCode === "EMAIL_NOT_CONFIGURED"
                  ? de ? "E-Mail ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut." : "Email is currently unavailable. Please try again later."
                  : de ? "Senden fehlgeschlagen. Bitte versuchen Sie es erneut." : "Sending failed. Please try again."
              : ""}
        </p>
      </div>
    </form>
  );
}
