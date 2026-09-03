"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ locale, mode, admin = false }: { locale: "de" | "en"; mode: "login" | "register"; admin?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const de = locale === "de";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(mode === "register" ? "/api/auth/register" : "/api/auth/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const result = await response.json();
      setError(
        result.error === "EMAIL_IN_USE"
          ? (de ? "Diese E-Mail wird bereits verwendet." : "That email is already in use.")
          : (de ? "Anmeldung nicht möglich. Prüfen Sie Ihre Angaben." : "Unable to sign in. Check your details.")
      );
      setBusy(false);
      return;
    }
    window.location.assign(admin ? "/admin" : `/${locale}/account/orders`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "register" && (
        <div>
          <Label htmlFor="name">{de ? "Vollständiger Name" : "Full Name"}</Label>
          <Input id="name" name="name" autoComplete="name" placeholder="Erika Muster" required className="mt-1" />
        </div>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@beispiel.ch" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="password">{de ? "Passwort" : "Password"}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={mode === "register" ? 10 : 1}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          placeholder="••••••••"
          required
          className="mt-1"
        />
        {mode === "login" ? <a href={`/${locale}/forgot-password`} className="mt-2 block text-right text-xs font-bold text-primary underline">{de ? "Passwort vergessen?" : "Forgot password?"}</a> : null}
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? (de ? "Bitte warten..." : "Please wait...") : mode === "register" ? (de ? "Konto erstellen" : "Create account") : (de ? "Anmelden" : "Sign in")}
      </Button>

      {!admin && (
        <div className="pt-2">
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-4 text-xs text-muted uppercase font-bold">{de ? "oder" : "or"}</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <a
            className="mt-2 flex min-h-11 items-center justify-center gap-3 rounded-xl border border-border bg-surface font-semibold text-sm hover:bg-background transition-all"
            href={`/api/auth/signin/google?callbackUrl=/${locale}/account/orders`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{de ? "Mit Google fortfahren" : "Continue with Google"}</span>
          </a>
        </div>
      )}
    </form>
  );
}
