import type { Metadata } from "next";

export function localizedMetadata(
  locale: string,
  path: string,
  title: { de: string; en: string },
  description: { de: string; en: string },
  images: string[] = [],
): Metadata {
  const language = locale === "en" ? "en" : "de";
  return {
    title: title[language],
    description: description[language],
    alternates: {
      canonical: `/${language}${path}`,
      languages: {
        "de-CH": `/de${path}`,
        "en-CH": `/en${path}`,
        "x-default": `/de${path}`,
      },
    },
    openGraph: {
      type: "website",
      locale: language === "de" ? "de_CH" : "en_CH",
      title: title[language],
      description: description[language],
      url: `/${language}${path}`,
      images,
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title: title[language],
      description: description[language],
      images,
    },
  };
}

export function pageTitleMetadata(
  title: { de: string; en: string },
  robots?: { index: boolean; follow: boolean },
) {
  return async ({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> => ({
    title: title[(await params).locale === "en" ? "en" : "de"],
    ...(robots ? { robots } : {}),
  });
}
