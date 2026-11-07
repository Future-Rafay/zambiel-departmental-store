import { cache } from "react";
import { storeConfig } from "@/config/store";
import { prisma } from "@/server/db";

export const getRuntimeStoreConfig = cache(async () => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  return {
    ...storeConfig,
    identity: { ...storeConfig.identity, name: settings?.displayName?.trim() || storeConfig.identity.name },
    contact: { ...storeConfig.contact, email: settings?.email?.trim() || storeConfig.contact.email, phone: settings?.phone?.trim() || storeConfig.contact.phone, address: settings?.street && settings.postalCode && settings.city ? { street: settings.street, postalCode: settings.postalCode, city: settings.city } : storeConfig.contact.address },
  };
});
