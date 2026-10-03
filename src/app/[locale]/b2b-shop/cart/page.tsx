import { B2bAccessGate } from "@/components/site/b2b-access-gate";
import { CartPage } from "@/components/site/cart-page";
import { getB2bViewer } from "@/server/services/b2b-access";

export default async function B2bCartPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const viewer = await getB2bViewer();
  if (viewer.status !== "APPROVED") return <B2bAccessGate locale={locale} signedIn={!!viewer.user} status={viewer.status} />;
  return <CartPage locale={locale} b2b />;
}
