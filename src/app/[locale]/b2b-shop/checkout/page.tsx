import { B2bAccessGate } from "@/components/site/b2b-access-gate";
import { CheckoutForm } from "@/components/site/checkout-form";
import { prisma } from "@/server/db";
import { getB2bViewer } from "@/server/services/b2b-access";
import { getShippingCountries } from "@/server/services/ordering";

export default async function B2bCheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const viewer = await getB2bViewer();
  if (viewer.status !== "APPROVED" || !viewer.user) return <B2bAccessGate locale={locale} signedIn={!!viewer.user} status={viewer.status} />;
  const [profile, shippingCountries] = await Promise.all([
    prisma.user.findUnique({ where: { id: viewer.user.id }, include: { addresses: { where: { isDefault: true }, take: 1 } } }),
    getShippingCountries(),
  ]);
  return <div className="mx-auto max-w-7xl px-4 py-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Zambiel B2B</p><h1 className="mb-8 mt-2 font-display text-4xl font-bold">{locale === "de" ? "B2B-Kasse" : "B2B Checkout"}</h1><CheckoutForm locale={locale} storeMode="b2b" countries={shippingCountries.map((country) => ({ ...country, countryCode: country.countryCode! }))} user={profile ? { name: profile.name, email: profile.email, phone: profile.phone, address: profile.addresses[0] ?? null } : undefined} /></div>;
}
