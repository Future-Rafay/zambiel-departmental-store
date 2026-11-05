import { pageTitleMetadata } from "@/lib/metadata";
import { CartPage } from "@/components/site/cart-page";

export const generateMetadata = pageTitleMetadata({ de: "Warenkorb", en: "Cart" }, { index: false, follow: false });

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <CartPage locale={(await params).locale === "en" ? "en" : "de"} />;
}
