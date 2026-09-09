import { cache } from "react";
import { buildDeliveryAnnouncement } from "@/lib/delivery-announcement";
import { prisma } from "@/server/db";
import { resolvePublicImageUrl } from "@/server/storage/s3";
import { storeConfig } from "@/config/store";

export const getPublicConfig = cache(async function getPublicConfig() {
  const [site, fulfillment, deliveryZones] = await Promise.all([
    prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.fulfillmentSettings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.deliveryZone.findMany({
      where: { active: true, countryCode: { not: null } },
      orderBy: { sortOrder: "asc" },
    }),
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
      logoKey: resolvePublicImageUrl(site.logoKey) ?? storeConfig.brand.logo,
      compactLogoKey: resolvePublicImageUrl(site.compactLogoKey) ?? storeConfig.brand.compactLogo,
      heroImageKey: resolvePublicImageUrl(site.heroImageKey),
      heroTitleDe: site.heroTitleDe,
      heroTitleEn: site.heroTitleEn,
      heroSubtitleDe: site.heroSubtitleDe,
      heroSubtitleEn: site.heroSubtitleEn,
      aboutDe: site.aboutDe,
      aboutEn: site.aboutEn,
      street: site.street,
      postalCode: site.postalCode,
      city: site.city,
      instagramUrl: site.instagramUrl || storeConfig.contact.social.instagram,
      facebookUrl: site.facebookUrl || storeConfig.contact.social.facebook,
    },
    fulfillment: {
      deliveryEnabled: fulfillment.deliveryEnabled,
      pickupEnabled: fulfillment.pickupEnabled,
    },
    announcements: site.announcementActive
      ? deliveryZones.map((zone) => {
          const input = {
            countryNameDe: zone.nameDe,
            countryNameEn: zone.nameEn,
            minimumSubtotalRappen: zone.minimumSubtotalRappen,
            freeDeliveryThresholdRappen: zone.freeDeliveryThresholdRappen,
          };
          return { de: buildDeliveryAnnouncement(input, "de"), en: buildDeliveryAnnouncement(input, "en") };
        })
      : [],
  };
});
