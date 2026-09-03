import { Card } from "@/components/ui/card";

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const de = (await params).locale !== "en";

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-border/60 pb-5">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
          ZAMBIEL
        </span>
        <h1 className="font-display text-4xl font-extrabold text-primary mt-1">
          {de ? "Datenschutzerklärung" : "Privacy Policy"}
        </h1>
      </div>

      <Card className="p-8 space-y-4">
        <p className="text-base text-foreground font-semibold">
          {de ? "Datenschutz bei Zambiel" : "Data privacy at Zambiel"}
        </p>
        <p className="text-sm text-muted leading-relaxed">
          {de
            ? "Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Personenbezogene Daten wie Name, Adresse, E-Mail-Adresse und Telefonnummer werden ausschliesslich zur Abwicklung Ihrer Bestellungen verwendet."
            : "We take the protection of your personal data very seriously. Personal details such as name, address, email, and phone number are used exclusively to process your orders."}
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
