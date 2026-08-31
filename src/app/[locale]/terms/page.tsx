import { Card } from "@/components/ui/card";

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const de = (await params).locale !== "en";

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-border/60 pb-5">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
          ZAMBIEL
        </span>
        <h1 className="font-display text-4xl font-extrabold text-primary mt-1">
          {de ? "Allgemeine Geschäftsbedingungen" : "Terms and Conditions"}
        </h1>
      </div>

      <Card className="p-8 space-y-4">
        <p className="text-base text-foreground font-semibold">
          {de ? "AGB & Bestellbestimmungen" : "Terms & Order Conditions"}
        </p>
        <p className="text-sm text-muted leading-relaxed">
          {de
            ? "Die rechtlich geprüften Geschäftsbedingungen sind noch nicht konfiguriert. Der Shop darf vor ihrer Freigabe nicht für Produktionsbestellungen aktiviert werden."
            : "Legally reviewed terms have not been configured. The store must not accept production orders until they are approved."}
        </p>
        <p className="text-xs text-muted/80 pt-2 border-t border-border/60">
          {de
            ? "Der endgültige rechtliche Text muss vor der Veröffentlichung durch den Betreiber bestätigt werden."
            : "Final legal copy must be confirmed by the business owner before production publication."}
        </p>
      </Card>
    </div>
  );
}
