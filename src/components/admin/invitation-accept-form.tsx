"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function InvitationAcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirmPassword")) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/staff/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: form.get("name"), password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The invitation could not be accepted.");
      router.push("/admin/login?accepted=1");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The invitation could not be accepted.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invitation-name">Full name</Label>
        <Input id="invitation-name" name="name" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invitation-password">Password</Label>
        <PasswordInput id="invitation-password" name="password" minLength={12} autoComplete="new-password" aria-describedby="password-help" required />
        <p id="password-help" className="text-xs text-muted">Use at least 12 characters.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="invitation-confirm-password">Confirm password</Label>
        <PasswordInput id="invitation-confirm-password" name="confirmPassword" minLength={12} autoComplete="new-password" required />
      </div>
      <div role="status" aria-live="polite" className="min-h-5 text-sm font-semibold text-destructive">{error}</div>
      <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Creating account…" : "Accept invitation"}</Button>
    </form>
  );
}
