import { CheckCircle2, ChevronRight, Clock, Package, ShoppingBag, Truck, XCircle } from "lucide-react";
import Link from "next/link";

import { Empty } from "@/components/admin/admin-ui";
import { badgeClasses, tones, type Tone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney, orderStatusTone } from "@/lib/orders";
import type { getOrderHistory } from "@/server/services/admin";
import { TableShell, tableHeadClasses } from "@/components/ui/table";

export type OrderStatusFilter = "ALL" | "UNPAID_B2B" | "PAYMENT_PENDING" | "CONFIRMED" | "PROCESSING" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "DELIVERED" | "PICKED_UP" | "CANCELLED";
type Order = Awaited<ReturnType<typeof getOrderHistory>>[number];

const statusTabs = [
  { value: "ALL", label: "All", icon: ShoppingBag, tone: "neutral" },
  { value: "UNPAID_B2B", label: "Unpaid B2B", icon: Clock, tone: "warning" },
  { value: "PAYMENT_PENDING", label: "Pending", icon: Clock, tone: orderStatusTone("PAYMENT_PENDING") },
  { value: "CONFIRMED", label: "Confirmed", icon: CheckCircle2, tone: orderStatusTone("CONFIRMED") },
  { value: "PROCESSING", label: "Processing", icon: Clock, tone: orderStatusTone("PROCESSING") },
  { value: "READY_FOR_PICKUP", label: "Ready", icon: Package, tone: orderStatusTone("READY_FOR_PICKUP") },
  { value: "OUT_FOR_DELIVERY", label: "Out for delivery", icon: Truck, tone: orderStatusTone("OUT_FOR_DELIVERY") },
  { value: "DELIVERED", label: "Delivered", icon: CheckCircle2, tone: orderStatusTone("DELIVERED") },
  { value: "PICKED_UP", label: "Picked up", icon: CheckCircle2, tone: orderStatusTone("PICKED_UP") },
  { value: "CANCELLED", label: "Cancelled", icon: XCircle, tone: orderStatusTone("CANCELLED") },
] as const satisfies ReadonlyArray<{ value: OrderStatusFilter; label: string; icon: typeof Clock; tone: Tone }>;


export function parseOrderStatus(value?: string): OrderStatusFilter {
  return statusTabs.some((tab) => tab.value === value) ? value as OrderStatusFilter : "ALL";
}

export function OrderStatusFilters({ activeStatus }: { activeStatus: OrderStatusFilter }) {
  return (
    <div className="mb-6 space-y-1"><p className="text-xs font-bold uppercase tracking-wide text-muted">Filter orders</p>
      <div className="flex flex-wrap gap-2">{statusTabs.map((tab) => {
        const selected = activeStatus === tab.value;
        const Icon = tab.icon;
        return <Link key={tab.value} href={`/admin/orders?status=${tab.value}`} className={`inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3.5 text-xs font-bold transition-all duration-150 ${selected ? tones[tab.tone].solid : `bg-surface ${tones[tab.tone].outline}`}`} aria-current={selected ? "page" : undefined}><Icon aria-hidden="true" className="h-3.5 w-3.5" />{tab.label}</Link>;
      })}</div>
    </div>
  );
}

function date(value: string | Date) {
  return new Date(value).toLocaleString("en-CH", { timeZone: "Europe/Zurich", dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`${badgeClasses(orderStatusTone(status), "soft", "text-2xs")}`}>{status.replaceAll("_", " ")}</span>;
}

export function OrderHistory({ orders }: { orders: Order[] }) {
  if (!orders.length) return <Empty>No orders match this filter.</Empty>;
  return (
    <div className="space-y-3">
      <TableShell className="hidden shadow-xs md:block">
        <table className="w-full min-w-[760px] text-left text-sm"><thead className={tableHeadClasses}><tr>
          {['Order', 'Customer', 'Placed', 'Status', 'Payment'].map((label) => <th key={label} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-muted">{label}</th>)}
          <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-muted">Total</th><th className="w-8 px-5 py-3.5"><span className="sr-only">View</span></th>
        </tr></thead><tbody className="divide-y divide-border">{orders.map((order) => (
          <tr key={order.id} className="group transition-colors hover:bg-surface-muted">
            <td className="px-5 py-4"><Link className="font-extrabold text-primary transition-colors hover:text-secondary" href={`/admin/orders/${order.orderNumber}`}>{order.orderNumber}</Link><span className="mt-0.5 block text-xs text-muted">{order.fulfillmentType?.replace("_", " ")}</span></td>
            <td className="px-5 py-4"><span className="block font-semibold text-foreground">{order.customerName}</span><span className="block text-xs text-muted">{order.customerEmail}</span></td>
            <td className="px-5 py-4 text-xs text-muted">{date(order.createdAt)}</td><td className="px-5 py-4"><StatusBadge status={order.status} /></td>
            <td className="px-5 py-4 text-xs text-muted">{order.payment?.status ?? "—"}</td><td className="px-5 py-4 text-right font-bold text-foreground">{formatMoney(order.totalRappen, "en")}</td>
            <td className="px-5 py-4"><ChevronRight aria-hidden="true" className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" /></td>
          </tr>
        ))}</tbody></table>
      </TableShell>
      <div className="grid gap-3 md:hidden">{orders.map((order) => (
        <Link key={order.id} href={`/admin/orders/${order.orderNumber}`} className="rounded-card focus:outline-none focus:ring-2 focus:ring-secondary"><Card className="space-y-3 border-border bg-surface p-4 transition-colors hover:bg-surface-muted"><div className="flex items-center justify-between"><span className="font-extrabold text-primary">{order.orderNumber}</span><StatusBadge status={order.status} /></div><div className="flex items-center justify-between text-sm"><span className="font-semibold text-foreground">{order.customerName}</span><span className="font-bold text-foreground">{formatMoney(order.totalRappen, "en")}</span></div><div className="text-xs text-muted">{date(order.createdAt)}</div></Card></Link>
      ))}</div>
      <p className="pt-1 text-right text-xs text-muted">{orders.length} orders shown</p>
    </div>
  );
}
