import type { Metadata } from "next";
import { CheckoutForm } from "@/components/site/checkout-form";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        include: { address: true },
      })
    : null;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="mb-8 font-display text-4xl font-bold">
        {locale === "de" ? "Kasse" : "Checkout"}
      </h1>
      <CheckoutForm
        locale={locale}
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
