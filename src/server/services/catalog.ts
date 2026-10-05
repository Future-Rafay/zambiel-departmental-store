import { cache } from "react";
import { prisma } from "@/server/db";
import { storeConfig } from "@/config/store";

export const getPublicConfig = cache(async function getPublicConfig() {
  const [site, fulfillment] = await Promise.all([
    prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.fulfillmentSettings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);

  return {
    locales: ["de", "en"],
    brand: {
      displayName: site.displayName,
      email: site.email || storeConfig.contact.email,
      phone: site.phone || storeConfig.contact.phone,
      address: [site.street, site.postalCode, site.city].filter(Boolean).join(", "),
      primaryColor: site.primaryColor,
      secondaryColor: site.secondaryColor,
      logoKey: storeConfig.brand.logo,
      compactLogoKey: storeConfig.brand.compactLogo,
      heroImageKey: storeConfig.content.heroImage,
      heroTitleDe: storeConfig.content.heroTitle.de,
      heroTitleEn: storeConfig.content.heroTitle.en,
      heroSubtitleDe: storeConfig.content.heroSubtitle.de,
      heroSubtitleEn: storeConfig.content.heroSubtitle.en,
      aboutDe: storeConfig.content.about.de,
      aboutEn: storeConfig.content.about.en,
      street: site.street,
      postalCode: site.postalCode,
      city: site.city,
      instagramUrl: storeConfig.contact.social.instagram,
      facebookUrl: storeConfig.contact.social.facebook,
    },
    fulfillment: {
      deliveryEnabled: fulfillment.deliveryEnabled,
      pickupEnabled: fulfillment.pickupEnabled,
    },
    announcements: storeConfig.content.announcement.active
      ? [storeConfig.content.announcement.text]
      : [],
  };
});
