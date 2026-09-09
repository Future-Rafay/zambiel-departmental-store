import Link from "next/link";
import { AccountDeletionForm } from "@/components/site/account-deletion-form";
import { getCurrentUser } from "@/server/auth/current-user";

export default async function AccountDeletionPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";
  const user = await getCurrentUser();
  return <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
    <div className="max-w-2xl space-y-5">
      <h1 className="font-display text-4xl font-bold text-primary">{de ? "Zambiel-Konto löschen" : "Delete your Zambiel account"}</h1>
      <p>{de ? "Hier können Sie die Löschung Ihres Kundenkontos und der zugehörigen personenbezogenen Daten anfragen." : "Use this page to request deletion of your customer account and associated personal data."}</p>
      <p className="text-muted">{de
        ? "Die Anfrage wird zur Bearbeitung gespeichert. Bestell- und Zahlungsunterlagen werden im Rahmen der geltenden Aufbewahrungspflichten geprüft. Eine Löschanfrage storniert keine offenen Bestellungen."
        : "Your request is saved for processing. Order and payment records are reviewed against applicable retention requirements. A deletion request does not cancel open orders."}</p>
      {user?.role === "CUSTOMER" ? <><p className="text-sm">{user.email}</p><AccountDeletionForm locale={locale} /></> : <>
        <p>{de ? "Melden Sie sich mit Ihrem Kundenkonto an und öffnen Sie anschliessend diese Seite erneut." : "Sign in with your customer account, then return to this page."}</p>
        <Link className="inline-flex min-h-11 items-center font-bold text-primary underline" href={`/${locale}/login`}>{de ? "Anmelden" : "Sign in"}</Link>
      </>}
      <div className="pt-6"><Link className="text-primary underline" href={`/${locale}/contact`}>{de ? "Hilfe beim Kontozugriff" : "Help accessing your account"}</Link></div>
    </div>
  </div>;
}
