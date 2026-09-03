import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { OrderTracker } from "@/components/site/order-tracker";
import { getCurrentUser } from "@/server/auth/current-user";
import { getTrackedOrder } from "@/server/services/ordering";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orderNumber: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale: rawLocale, orderNumber } = await params;
  const locale = rawLocale === "en" ? "en" : "de";
  const token = (await searchParams).token;
  const user = await getCurrentUser();
  const order = await getTrackedOrder(orderNumber, user?.id, token);
  if (!order) notFound();
  return <OrderTracker initialOrder={order} token={token} locale={locale} />;
}
