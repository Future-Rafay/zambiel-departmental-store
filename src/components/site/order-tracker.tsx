"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import type { OrderStatus } from "@/generated/prisma/enums";
import { formatMoney, orderStatusLabel } from "@/lib/orders";

type Activity =
  | { id: string; kind: "ORDER_STATUS"; status: OrderStatus; at: string }
  | { id: string; kind: "CASH_PAYMENT_CONFIRMED"; at: string };
type Order = {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus?: string | null;
  fulfillmentType: string;
  subtotalRappen: number;
  discountRappen: number;
  deliveryFeeRappen: number;
  totalRappen: number;
  items: Array<{
    id: string;
    name: string;
    variant: string | null;
    quantity: number;
    lineSubtotalRappen: number;
    options: string[];
    imageUrl?: string | null;
  }>;
  timeline: Array<{ status: OrderStatus; at: string }>;
  activities?: Activity[];
};

export function OrderTracker({
  initialOrder,
  token,
  locale,
}: {
  initialOrder: Order;
  token?: string;
  locale: "de" | "en";
}) {
  const [order, setOrder] = useState(initialOrder);
  const de = locale === "de";
  useEffect(() => {
    const refresh = async () => {
      const response = await fetch(
        `/api/v1/customer/orders/${order.orderNumber}${token ? `?token=${encodeURIComponent(token)}` : ""}`,
        { cache: "no-store" },
      );
      if (response.ok) setOrder((await response.json()).order);
    };
    const timer = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(timer);
  }, [order.orderNumber, token]);
  const dateTime = (value: string) =>
    new Intl.DateTimeFormat(de ? "de-CH" : "en-CH", {
      timeZone: "Europe/Zurich",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  const history = order.activities
    ? [...order.activities].reverse()
    : order.timeline.map((event, index) => ({
        id: `${event.status}-${index}`,
        kind: "ORDER_STATUS" as const,
        ...event,
      }));
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
            ZAMBIEL
          </span>
          <h1 className="mt-1 font-display text-4xl font-extrabold text-primary">
            {order.orderNumber}
          </h1>
        </div>
        <span
          aria-live="polite"
          className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white"
        >
          {orderStatusLabel(order.status, locale)}
        </span>
      </header>
      {order.status === "PAYMENT_PENDING" && (
        <div
          role="status"
          className="rounded-xl border border-secondary/30 bg-secondary/10 p-4 text-sm"
        >
          <strong>
            {de ? "Zahlung wird bestätigt" : "Payment confirmation in progress"}
          </strong>
          <p className="mt-1 text-muted">
            {de
              ? "Stripe hat Sie zurückgeleitet. Diese Seite aktualisiert sich automatisch, sobald die sichere Zahlungsbestätigung eintrifft."
              : "This page updates automatically when Stripe sends the secure payment confirmation."}
          </p>
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="space-y-5 p-5">
          <h2 className="font-display text-xl font-bold text-primary">
            {de ? "Bestellte Artikel" : "Ordered items"}
          </h2>
          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-background">
                  <Image
                    src={
                      item.imageUrl ?? "/images/product-placeholder.svg"
                    }
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <strong>
                    {item.quantity}× {item.name}
                  </strong>
                  <small className="block text-muted">
                    {[item.variant, ...item.options].filter(Boolean).join(", ")}
                  </small>
                </div>
                <strong className="text-primary">
                  {formatMoney(item.lineSubtotalRappen, locale)}
                </strong>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt>{de ? "Zwischensumme" : "Subtotal"}</dt>
              <dd>{formatMoney(order.subtotalRappen, locale)}</dd>
            </div>
            {order.discountRappen > 0 && (
              <div className="flex justify-between text-success">
                <dt>{de ? "Rabatt" : "Discount"}</dt>
                <dd>−{formatMoney(order.discountRappen, locale)}</dd>
              </div>
            )}
            {order.fulfillmentType === "DELIVERY" && (
              <div className="flex justify-between">
                <dt>{de ? "Liefergebühr" : "Delivery fee"}</dt>
                <dd>
                  {order.deliveryFeeRappen
                    ? formatMoney(order.deliveryFeeRappen, locale)
                    : de
                      ? "Kostenlos"
                      : "Free"}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-lg font-bold text-primary">
              <dt>Total</dt>
              <dd>{formatMoney(order.totalRappen, locale)}</dd>
            </div>
          </dl>
        </Card>
        <Card className="space-y-5 p-5">
          <h2 className="font-display text-xl font-bold text-primary">
            {de ? "Bestellverlauf" : "Order history"}
          </h2>
          <ol className="ml-2 space-y-5 border-l-2 border-secondary/40">
            {history.map((event) => (
              <li key={event.id} className="relative ml-5">
                <span
                  aria-hidden="true"
                  className="absolute -left-[27px] top-1 size-3 rounded-full bg-secondary ring-4 ring-surface"
                />
                <strong className="block">
                  {event.kind === "CASH_PAYMENT_CONFIRMED"
                    ? de
                      ? "Barzahlung bestätigt"
                      : "Cash payment confirmed"
                    : orderStatusLabel(event.status, locale)}
                </strong>
                <time className="text-xs text-muted">{dateTime(event.at)}</time>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
