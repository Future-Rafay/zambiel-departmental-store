export const storeConfig = {
  identity: {
    name: "Zambiel",
    shortName: "Zambiel",
    tagline: { de: "Das Warenhaus für den Alltag", en: "The everyday department store" },
    description: {
      de: "Ein modernes Schweizer Warenhaus für Produkte des täglichen Bedarfs.",
      en: "A modern Swiss department store for everyday products.",
    },
    countryCode: "CH",
    currency: "CHF",
    timezone: "Europe/Zurich",
    orderPrefix: "ZAM",
    storagePrefix: "Zambiel",
    defaultLocale: "de",
    locales: ["de", "en"],
  },
  brand: {
    logo: null as string | null,
    compactLogo: null as string | null,
    favicon: null as string | null,
    colors: {
      primary: "#153B35",
      primaryLight: "#2B5C52",
      primaryDark: "#0B2622",
      accent: "#D6A84B",
      background: "#F4F7F3",
      surface: "#FFFFFF",
      foreground: "#102722",
      muted: "#60716B",
      border: "#D7E1DB",
    },
    fonts: { display: "Inter", body: "Archivo" },
  },
  contact: {
    phone: null as string | null,
    email: null as string | null,
    address: null as null | { street: string; postalCode: string; city: string },
    website: null as string | null,
    social: { instagram: "https://www.instagram.com/", facebook: "https://www.facebook.com/", whatsapp: "https://www.whatsapp.com/" },
  },
  content: {
    heroImage: null as string | null,
    heroTitle: {
      de: "Gutes für Alltag, Zuhause und unterwegs.",
      en: "Useful goods for everyday life, home and the road.",
    },
    heroSubtitle: {
      de: "Entdecken Sie praktische Technik, Haushalt und Fahrzeugzubehör in einem klar kuratierten Sortiment.",
      en: "Discover practical technology, home essentials and vehicle accessories in one clearly curated range.",
    },
    about: { de: null as string | null, en: null as string | null },
    announcement: {
      active: true,
      text: {
        de: "10 % Willkommensrabatt mit WELCOME10 ab CHF 50.",
        en: "10% welcome discount with WELCOME10 from CHF 50.",
      },
    },
  },
  seo: {
    title: { de: "Zambiel – Schweizer Warenhaus", en: "Zambiel – Swiss department store" },
    description: {
      de: "Produkte für Haushalt und Alltag – zur Lieferung oder Abholung.",
      en: "Household and everyday products for delivery or pickup.",
    },
  },
  footer: { text: { de: "Ihr Warenhaus für den Alltag.", en: "Your department store for everyday life." } },
} as const;

export type StoreLocale = (typeof storeConfig.identity.locales)[number];
export type StoreCurrency = typeof storeConfig.identity.currency;

export function localized<T>(locale: StoreLocale, value: { de: T; en: T }) {
  return value[locale];
}

export function formatStoreMoney(rappen: number, locale: StoreLocale = storeConfig.identity.defaultLocale) {
  return new Intl.NumberFormat(locale === "de" ? "de-CH" : "en-CH", {
    style: "currency",
    currency: storeConfig.identity.currency,
  }).format(rappen / 100);
}
