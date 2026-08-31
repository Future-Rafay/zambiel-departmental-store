import type { Metadata } from "next";
import Link from "next/link";

import { InvitationAcceptForm } from "@/components/admin/invitation-accept-form";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Accept staff invitation | Zambiel", robots: { index: false, follow: false } };

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token?.trim() ?? "";

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <BrandLogo className="h-20 w-48" priority />
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-secondary">Staff invitation</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Create your staff account</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Set your name and password to access Zambiel order operations.</p>
        {token ? <InvitationAcceptForm token={token} /> : <div role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"><p className="font-semibold text-destructive">This invitation link is incomplete.</p><p className="mt-1 text-muted">Open the full link from your invitation email or ask the owner for a new invitation.</p></div>}
        <Link href="/admin/login" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">Back to staff sign in</Link>
      </Card>
    </main>
  );
}
