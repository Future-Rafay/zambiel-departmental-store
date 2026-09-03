import { CheckCircle2, ChevronRight, Clock, Package, ShoppingBag, Truck, XCircle } from "lucide-react";
import Link from "next/link";

import { Empty } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/orders";
import type { getOrderHistory } from "@/server/services/admin";

export type OrderStatusFilter = "ALL" | "PAYMENT_PENDING" | "CONFIRMED" | "PROCESSING" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "DELIVERED" | "PICKED_UP" | "CANCELLED";
type Order = Awaited<ReturnType<typeof getOrderHistory>>[number];

const statusTabs = [
  { value: "ALL", label: "All", icon: ShoppingBag, color: "border-border text-foreground hover:bg-background", active: "bg-foreground text-surface border-foreground" },
  { value: "PAYMENT_PENDING", label: "Pending", icon: Clock, color: "border-orange-300 text-orange-700 hover:bg-orange-50", active: "bg-orange-600 text-white border-orange-600" },
  { value: "CONFIRMED", label: "Confirmed", icon: CheckCircle2, color: "border-blue-300 text-blue-700 hover:bg-blue-50", active: "bg-blue-600 text-white border-blue-600" },
  { value: "PROCESSING", label: "Processing", icon: Clock, color: "border-purple-300 text-purple-700 hover:bg-purple-50", active: "bg-purple-600 text-white border-purple-600" },
  { value: "READY_FOR_PICKUP", label: "Ready", icon: Package, color: "border-indigo-300 text-indigo-700 hover:bg-indigo-50", active: "bg-indigo-600 text-white border-indigo-600" },
  { value: "OUT_FOR_DELIVERY", label: "Out for delivery", icon: Truck, color: "border-cyan-300 text-cyan-700 hover:bg-cyan-50", active: "bg-cyan-600 text-white border-cyan-600" },
  { value: "DELIVERED", label: "Delivered", icon: CheckCircle2, color: "border-emerald-300 text-emerald-700 hover:bg-emerald-50", active: "bg-emerald-600 text-white border-emerald-600" },
  { value: "PICKED_UP", label: "Picked up", icon: CheckCircle2, color: "border-emerald-300 text-emerald-700 hover:bg-emerald-50", active: "bg-emerald-600 text-white border-emerald-600" },
  { value: "CANCELLED", label: "Cancelled", icon: XCircle, color: "border-destructive/40 text-destructive hover:bg-destructive/5", active: "bg-destructive text-white border-destructive" },
] as const;

const statusBadge: Record<string, string> = {
  PAYMENT_PENDING: "bg-orange-100 text-orange-700", CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700", READY_FOR_PICKUP: "bg-indigo-100 text-indigo-700",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-700", DELIVERED: "bg-emerald-100 text-emerald-700",
  PICKED_UP: "bg-emerald-100 text-emerald-700", CANCELLED: "bg-red-100 text-red-700",
};

export function parseOrderStatus(value?: string): OrderStatusFilter {
  return statusTabs.some((tab) => tab.value === value) ? value as OrderStatusFilter : "ALL";
}

export function OrderStatusFilters({ activeStatus }: { activeStatus: OrderStatusFilter }) {
  return (
    <div className="mb-6 space-y-1"><p className="text-xs font-bold uppercase tracking-wide text-muted">Filter by status</p>
      <div className="flex flex-wrap gap-2">{statusTabs.map((tab) => {
        const selected = activeStatus === tab.value;
        const Icon = tab.icon;
        return <Link key={tab.value} href={`/admin/orders?status=${tab.value}`} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-all duration-150 ${selected ? tab.active : `bg-white ${tab.color}`}`} aria-current={selected ? "page" : undefined}><Icon aria-hidden="true" className="h-3.5 w-3.5" />{tab.label}</Link>;
      })}</div>
    </div>
  );
}

function date(value: string | Date) {
  return new Date(value).toLocaleString("en-CH", { timeZone: "Europe/Zurich", dateStyle: "medium", timeStyle: "short" });
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadge[status] ?? "bg-gray-100 text-gray-700"}`}>{status.replaceAll("_", " ")}</span>;
}

export function OrderHistory({ orders }: { orders: Order[] }) {
  if (!orders.length) return <Empty>No orders match this filter.</Empty>;
  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto rounded-xl border border-[#E1E3E5] bg-white shadow-xs md:block">
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#E1E3E5] bg-[#F6F6F7]"><tr>
          {['Order', 'Customer', 'Placed', 'Status', 'Payment'].map((label) => <th key={label} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-muted">{label}</th>)}
          <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-muted">Total</th><th className="w-8 px-5 py-3.5"><span className="sr-only">View</span></th>
        </tr></thead><tbody className="divide-y divide-[#F1F1F1]">{orders.map((order) => (
          <tr key={order.id} className="group transition-colors hover:bg-[#F9F9F9]">
            <td className="px-5 py-4"><Link className="font-extrabold text-primary transition-colors hover:text-secondary" href={`/admin/orders/${order.orderNumber}`}>{order.orderNumber}</Link><span className="mt-0.5 block text-xs text-muted">{order.fulfillmentType?.replace("_", " ")}</span></td>
            <td className="px-5 py-4"><span className="block font-semibold text-foreground">{order.customerName}</span><span className="block text-xs text-muted">{order.customerEmail}</span></td>
            <td className="px-5 py-4 text-xs text-muted">{date(order.createdAt)}</td><td className="px-5 py-4"><StatusBadge status={order.status} /></td>
            <td className="px-5 py-4 text-xs text-muted">{order.payment?.status ?? "—"}</td><td className="px-5 py-4 text-right font-bold text-foreground">{formatMoney(order.totalRappen, "en")}</td>
            <td className="px-5 py-4"><ChevronRight aria-hidden="true" className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" /></td>
          </tr>
        ))}</tbody></table>
      </div>
      <div className="grid gap-3 md:hidden">{orders.map((order) => (
        <Link key={order.id} href={`/admin/orders/${order.orderNumber}`} className="rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary"><Card className="space-y-3 border-[#E1E3E5] bg-white p-4 transition-colors hover:bg-[#F9F9F9]"><div className="flex items-center justify-between"><span className="font-extrabold text-primary">{order.orderNumber}</span><StatusBadge status={order.status} /></div><div className="flex items-center justify-between text-sm"><span className="font-semibold text-foreground">{order.customerName}</span><span className="font-bold text-foreground">{formatMoney(order.totalRappen, "en")}</span></div><div className="text-xs text-muted">{date(order.createdAt)}</div></Card></Link>
      ))}</div>
      <p className="pt-1 text-right text-xs text-muted">{orders.length} orders shown</p>
    </div>
  );
}
