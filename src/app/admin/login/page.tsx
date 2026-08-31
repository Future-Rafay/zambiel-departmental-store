import { AuthForm } from "@/components/site/auth-form";
import { Card } from "@/components/ui/card";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ accepted?: string }> }) {
  const accepted = (await searchParams).accepted === "1";
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <p className="font-semibold text-secondary">ZAMBIEL ADMIN</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Staff sign in</h1>
        {accepted && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Invitation accepted. Sign in with your new password.</p>}
        <div className="mt-6"><AuthForm locale="en" mode="login" admin /></div>
      </Card>
    </main>
  );
}
