import { storeConfig } from "@/config/store";

export const supportedLocales = storeConfig.identity.locales;
export type SiteLocale = (typeof supportedLocales)[number];

export const supportedCurrencies = [storeConfig.identity.currency] as const;
export type SiteCurrency = (typeof supportedCurrencies)[number];

export const siteConfig: { locale: SiteLocale; currency: SiteCurrency } = {
  locale: storeConfig.identity.defaultLocale,
  currency: storeConfig.identity.currency,
};
