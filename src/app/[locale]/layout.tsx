import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CartProvider } from "@/components/site/cart-context";
import { SiteShell } from "@/components/site/site-shell";
import { isAppLocale, locales } from "@/i18n/config";
import { getCurrentUser } from "@/server/auth/current-user";
import { getPublicConfig } from "@/server/services/catalog";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();

  const [currentUser, publicConfig] = await Promise.all([
    getCurrentUser(),
    getPublicConfig(),
  ]);
  const user = currentUser
    ? {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        image: currentUser.image,
        role: currentUser.role,
      }
    : null;

  return (
    <CartProvider>
      <SiteShell
        locale={locale}
        user={user}
        publicConfig={{
          announcement: publicConfig.announcement,
          facebookUrl: publicConfig.brand.facebookUrl,
          instagramUrl: publicConfig.brand.instagramUrl,
        }}
      >
        {children}
      </SiteShell>
    </CartProvider>
  );
}
