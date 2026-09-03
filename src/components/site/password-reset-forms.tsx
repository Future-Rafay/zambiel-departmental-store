"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm({ locale }: { locale: "de" | "en" }) {
  const de = locale === "de";
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const response = await fetch("/api/auth/password/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, locale }) }).catch(() => null);
    setStatus(response?.ok ? "done" : "error");
  }
  return <form onSubmit={submit} className="space-y-4"><div><Label htmlFor="forgot-email">Email</Label><Input id="forgot-email" name="email" type="email" autoComplete="email" required className="mt-1" /></div><Button type="submit" className="w-full" disabled={status === "sending"}>{status === "sending" ? (de ? "Wird gesendet…" : "Sending…") : (de ? "Link senden" : "Send reset link")}</Button><p role="status" aria-live="polite" className={`text-sm ${status === "error" ? "text-destructive" : "text-success"}`}>{status === "done" ? (de ? "Falls ein passendes Konto existiert, wurde ein Link gesendet." : "If a matching account exists, a reset link has been sent.") : status === "error" ? (de ? "Anfrage fehlgeschlagen." : "Request failed.") : ""}</p></form>;
}

export function ResetPasswordForm({ locale, token }: { locale: "de" | "en"; token: string }) {
  const de = locale === "de";
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [admin, setAdmin] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirmPassword") ?? "")) return setStatus("error");
    const response = await fetch("/api/auth/password/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }).catch(() => null);
    if (!response?.ok) return setStatus("error");
    setAdmin(Boolean((await response.json()).admin));
    setStatus("done");
  }
  if (status === "done") return <p role="status" className="text-success">{de ? "Passwort aktualisiert." : "Password updated."} <Link className="font-bold underline" href={admin ? "/admin/login" : `/${locale}/login`}>{de ? "Anmelden" : "Sign in"}</Link></p>;
  return <form onSubmit={submit} className="space-y-4"><div><Label htmlFor="new-password">{de ? "Neues Passwort" : "New password"}</Label><Input id="new-password" name="password" type="password" minLength={10} maxLength={200} autoComplete="new-password" required className="mt-1" /></div><div><Label htmlFor="confirm-password">{de ? "Passwort bestätigen" : "Confirm password"}</Label><Input id="confirm-password" name="confirmPassword" type="password" minLength={10} maxLength={200} autoComplete="new-password" required className="mt-1" /></div><Button type="submit" className="w-full" disabled={status === "saving"}>{status === "saving" ? (de ? "Wird gespeichert…" : "Saving…") : (de ? "Passwort speichern" : "Save password")}</Button>{status === "error" ? <p role="alert" className="text-sm text-destructive">{de ? "Der Link ist ungültig, abgelaufen oder die Passwörter stimmen nicht überein." : "The link is invalid or expired, or the passwords do not match."}</p> : null}</form>;
}
