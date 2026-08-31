"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, ExternalLink, PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/orders";

type AdminOrder = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  fulfillmentType: string;
  status: string;
  paymentMethod: string;
  paymentStatus?: string | null;
  totalRappen: number;
  version: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    options: string[];
  }>;
  allowedNextStatus: string | null;
};

const statusPills: Record<string, string> = {
  PAYMENT_PENDING: "bg-slate-100 text-slate-800 border-slate-300",
  CONFIRMED: "bg-blue-50 text-blue-800 border-blue-200",
  PROCESSING: "bg-amber-50 text-amber-800 border-amber-200",
  READY_FOR_PICKUP: "bg-purple-50 text-purple-800 border-purple-200",
  OUT_FOR_DELIVERY: "bg-orange-50 text-orange-800 border-orange-200",
  DELIVERED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PICKED_UP: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

const labels: Record<string, string> = {
  PAYMENT_PENDING: "Payment pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  PICKED_UP: "Picked up",
};

export function AdminQueue({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [router]);

  async function mutate(key: string, url: string, body?: unknown) {
    setBusy(key);
    setError("");
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok)
      setError((await response.json()).error ?? "Action failed.");
    else router.refresh();
    setBusy("");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E1E3E5] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
            ZAMBIEL ORDER QUEUE
          </span>
          <h1 className="font-display text-2xl font-bold text-[#202223] tracking-tight">
            Live Order Queue
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Auto-refresh (10s)</span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-xs font-semibold text-destructive"
        >
          ⚠️ {error}
        </div>
      )}

      {/* Active Orders Section */}
      <section aria-labelledby="active-orders-title" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="active-orders-title"
            className="font-display text-lg font-bold text-[#202223]"
          >
            Active Orders ({orders.length})
          </h2>
        </div>

        {orders.length === 0 ? (
          <Card className="p-12 text-center border-[#E1E3E5] bg-white space-y-2">
            <div className="flex justify-center">
              <PackageCheck
                className="h-12 w-12 text-secondary/40"
                strokeWidth={1.5}
              />
            </div>
            <h3 className="font-display text-base font-bold text-primary">
              No active orders in queue
            </h3>
            <p className="text-xs text-muted">
              New incoming orders will appear here automatically.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card
                key={order.orderNumber}
                className="p-5 border-[#E1E3E5] bg-white space-y-4 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#E1E3E5] pb-3">
                  <div>
                    <span className="font-display text-lg font-extrabold text-primary">
                      {order.orderNumber}
                    </span>
                    <p className="text-xs text-muted mt-0.5">
                      <span className="font-bold text-foreground">
                        {order.customerName}
                      </span>{" "}
                      ·{" "}
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="hover:underline text-secondary font-semibold"
                      >
                        {order.customerPhone}
                      </a>
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${statusPills[order.status] ?? "bg-slate-100 text-slate-800"}`}
                  >
                    {labels[order.status] ?? order.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-muted bg-[#F6F6F7] p-2.5 rounded-lg">
                  <span>{order.fulfillmentType.replaceAll("_", " ")}</span>
                  <span className="font-bold text-primary">
                    {formatMoney(order.totalRappen, "en")}
                  </span>
                  <span className="font-bold uppercase text-[10px] bg-white px-2 py-0.5 rounded border border-border">
                    {order.paymentStatus}
                  </span>
                </div>

                <ul className="space-y-1.5 border-t border-[#E1E3E5] pt-3 text-xs text-foreground">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-baseline gap-2">
                      <span className="font-bold text-primary">
                        {item.quantity}×
                      </span>
                      <span className="font-medium">{item.name}</span>
                      {item.options.length > 0 && (
                        <span className="text-[11px] text-muted font-normal">
                          ({item.options.join(", ")})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2 border-t border-[#E1E3E5] pt-3">
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-xs font-bold text-primary"
                  >
                    <ExternalLink className="size-3.5" />
                    View details
                  </Link>
                  {order.allowedNextStatus && (
                    <Button
                      size="compact"
                      className="bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-2xs"
                      disabled={busy === order.orderNumber}
                      onClick={() =>
                        mutate(
                          order.orderNumber,
                          `/api/v1/staff/orders/${order.orderNumber}/advance`,
                          {
                            version: order.version,
                          },
                        )
                      }
                    >
                      Advance to{" "}
                      {labels[order.allowedNextStatus]?.toLowerCase()} →
                    </Button>
                  )}
                  {order.paymentMethod !== "STRIPE" &&
                    order.paymentStatus === "PENDING" && (
                      <Button
                        variant="secondary"
                        size="compact"
                        className="text-xs font-bold shadow-2xs"
                        disabled={busy === `${order.orderNumber}-cash`}
                        onClick={() =>
                          mutate(
                            `${order.orderNumber}-cash`,
                            `/api/v1/staff/orders/${order.orderNumber}/cash-payment`,
                          )
                        }
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        Confirm Cash Payment
                      </Button>
                    )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
