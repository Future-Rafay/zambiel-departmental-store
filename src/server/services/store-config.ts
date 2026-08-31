import { cache } from "react";
import { storeConfig } from "@/config/store";
import { prisma } from "@/server/db";
import { resolvePublicImageUrl } from "@/server/storage/s3";

export const getRuntimeStoreConfig = cache(async () => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return {
    ...storeConfig,
    identity: { ...storeConfig.identity, name: settings?.displayName?.trim() || storeConfig.identity.name },
    brand: { ...storeConfig.brand, logo: resolvePublicImageUrl(settings?.logoKey) ?? storeConfig.brand.logo, compactLogo: resolvePublicImageUrl(settings?.compactLogoKey) ?? storeConfig.brand.compactLogo, favicon: resolvePublicImageUrl(settings?.faviconKey) ?? storeConfig.brand.favicon, colors: { ...storeConfig.brand.colors, primary: settings?.primaryColor || storeConfig.brand.colors.primary, accent: settings?.secondaryColor || storeConfig.brand.colors.accent } },
    contact: { ...storeConfig.contact, email: settings?.email?.trim() || storeConfig.contact.email, phone: settings?.phone?.trim() || storeConfig.contact.phone, address: settings?.street && settings.postalCode && settings.city ? { street: settings.street, postalCode: settings.postalCode, city: settings.city } : storeConfig.contact.address, social: { ...storeConfig.contact.social, instagram: settings?.instagramUrl || storeConfig.contact.social.instagram, facebook: settings?.facebookUrl || storeConfig.contact.social.facebook } },
    content: { heroImage: resolvePublicImageUrl(settings?.heroImageKey), heroTitle: { de: settings?.heroTitleDe || null, en: settings?.heroTitleEn || null }, heroSubtitle: { de: settings?.heroSubtitleDe || null, en: settings?.heroSubtitleEn || null }, about: { de: settings?.aboutDe || null, en: settings?.aboutEn || null }, announcementActive: settings?.announcementActive ?? false },
  };
});
