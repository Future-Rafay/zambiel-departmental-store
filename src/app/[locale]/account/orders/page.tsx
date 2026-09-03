import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, ShoppingBag } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatMoney, orderStatusLabel } from "@/lib/orders";
import { getCurrentUser } from "@/server/auth/current-user";
import { getCustomerOrders } from "@/server/services/ordering";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale === "en" ? "en" : "de";
  const de = locale === "de";
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const orders = await getCustomerOrders(user.id);

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-blue-600 text-white",
    PROCESSING: "bg-amber-600 text-white",
    READY_FOR_PICKUP: "bg-emerald-600 text-white",
    OUT_FOR_DELIVERY: "bg-secondary text-secondary-foreground",
    DELIVERED: "bg-success text-white",
    PICKED_UP: "bg-success text-white",
    CANCELLED: "bg-destructive text-white",
    PAYMENT_PENDING: "bg-muted text-foreground",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
          ZAMBIEL ACCOUNT
        </span>
        <h1 className="font-display text-4xl font-extrabold text-primary mt-1">
          {de ? "Meine Bestellungen" : "My Orders"}
        </h1>
        <p className="text-sm text-muted mt-1">
          {de ? `Angemeldet als ${user.email}` : `Signed in as ${user.email}`}
        </p>
      </div>

      {orders.length === 0 ? (
        <Card className="max-w-7xl mx-auto space-y-6 rounded-none p-12 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <ShoppingBag className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-primary">
              {de ? "Noch keine Bestellungen" : "No orders yet"}
            </h2>
            <p className="text-sm text-muted">
              {de
                ? "Sobald Sie eine Bestellung aufgeben, finden Sie diese hier zum Verfolgen."
                : "Once you place an order, you can track it right here."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/${locale}/products`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-secondary px-8 text-sm font-bold text-secondary-foreground shadow hover:bg-secondary-light transition-all"
            >
              {de ? "Jetzt bestellen" : "Order now"}
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {orders.map((order) => (
            <Link
              key={order.orderNumber}
              href={`/${locale}/orders/${order.orderNumber}`}
            >
              <Card
                hover
                className="group flex h-full flex-col justify-between space-y-4 rounded-none p-6"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <span className="font-display font-extrabold text-lg text-primary group-hover:text-secondary transition-colors">
                    {order.orderNumber}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${statusColors[order.status] ?? "bg-primary text-white"}`}
                  >
                    {orderStatusLabel(order.status, locale)}
                  </span>
                </div>

                <div className="flex items-end justify-between pt-2">
                  <span className="text-xs text-muted font-medium">
                    {de ? "Gesamtsumme" : "Total amount"}
                  </span>
                  <strong className="font-display text-xl font-bold text-primary">
                    {formatMoney(order.totalRappen, locale)}
                  </strong>
                </div>

                {order.activities[0] && (
                  <p className="text-xs text-muted">
                    {order.activities[0].kind === "CASH_PAYMENT_CONFIRMED"
                      ? de
                        ? "Barzahlung bestätigt"
                        : "Cash payment confirmed"
                      : orderStatusLabel(order.activities[0].status, locale)}
                    {" · "}
                    {new Intl.DateTimeFormat(de ? "de-CH" : "en-CH", {
                      timeZone: "Europe/Zurich",
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(order.activities[0].at))}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-between text-xs font-bold text-secondary border-t border-border/40">
                  <span>
                    {de
                      ? "Details & Status verfolgen"
                      : "Track details & status"}
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
