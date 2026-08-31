import { redirect } from "next/navigation";
export default async function LegacyMenuPage({ params }: { params: Promise<{ locale: string }> }) { const locale = (await params).locale === "en" ? "en" : "de"; redirect(`/${locale}/products`); }
