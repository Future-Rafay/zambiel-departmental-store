import type { Metadata } from "next";
import { CheckoutForm } from "@/components/site/checkout-form";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db";
import { getShippingCountries } from "@/server/services/ordering";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const user = await getCurrentUser();
  const [profile, shippingCountries] = await Promise.all([user ? await prisma.user.findUnique({ where: { id: user.id }, include: { address: true } }) : null, getShippingCountries()]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-8 font-display text-4xl font-bold">
        {locale === "de" ? "Kasse" : "Checkout"}
      </h1>
      <CheckoutForm
        locale={locale}
        countries={shippingCountries.map((country) => ({ ...country, countryCode: country.countryCode! }))}
        user={
          profile
            ? {
                name: profile.name,
                email: profile.email,
                phone: profile.phone,
                address: profile.address,
              }
            : undefined
        }
      />
    </div>
  );
}
export const metadata: Metadata = { robots: { index: false, follow: false } };
