import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import { headers } from "next/headers";
import type { CSSProperties, ReactNode } from "react";

import { getPublicConfig } from "@/server/services/catalog";
import { storeConfig } from "@/config/store";

import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: storeConfig.seo.title.de,
    template: `%s | ${storeConfig.identity.name}`,
  },
  description: storeConfig.seo.description.de,
  openGraph: {
    type: "website",
    siteName: storeConfig.identity.name,
    title: storeConfig.seo.title.de,
    description: storeConfig.seo.description.de,
  },
  twitter: {
    card: "summary",
    title: storeConfig.seo.title.de,
    description: storeConfig.seo.description.de,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [{ brand }, requestHeaders] = await Promise.all([
    getPublicConfig(),
    headers(),
  ]);
  const language =
    requestHeaders.get("x-next-intl-locale") === "de" ? "de" : "en";
  const brandStyle = {
    "--brand-primary": brand.primaryColor,
    "--brand-secondary": brand.secondaryColor,
  } as CSSProperties;
  const storeJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Store",
    name: brand.displayName,
    url: process.env.APP_URL ?? "http://localhost:3000",
    telephone: brand.phone || undefined,
    email: brand.email || undefined,
    address: brand.address || undefined,
  }).replaceAll("<", "\\u003c");
  return (
    <html
      lang={language}
      data-scroll-behavior="smooth"
      className={`${archivo.variable} ${inter.variable}`}
    >
      <body suppressHydrationWarning style={brandStyle}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: storeJsonLd }}
        />
        {children}
      </body>
    </html>
  );
}
