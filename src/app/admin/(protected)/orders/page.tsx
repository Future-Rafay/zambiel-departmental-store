import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Package,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

import { AdminPage, Empty, Notice } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/orders";
import { getOrderHistory } from "@/server/services/admin";

type OrderStatus =
  | "ALL"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "PICKED_UP"
  | "CANCELLED";

const STATUS_TABS: {
  value: OrderStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  activeColor: string;
}[] = [
  {
    value: "ALL",
    label: "All",
    icon: <ShoppingBag className="h-3.5 w-3.5" />,
    color: "border-border text-foreground hover:bg-background",
    activeColor: "bg-foreground text-surface border-foreground",
  },
  {
    value: "PAYMENT_PENDING",
    label: "Pending",
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "border-orange-300 text-orange-700 hover:bg-orange-50",
    activeColor: "bg-orange-600 text-white border-orange-600",
  },
  {
    value: "CONFIRMED",
    label: "Confirmed",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "border-blue-300 text-blue-700 hover:bg-blue-50",
    activeColor: "bg-blue-600 text-white border-blue-600",
  },
  {
    value: "PROCESSING",
    label: "Processing",
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "border-purple-300 text-purple-700 hover:bg-purple-50",
    activeColor: "bg-purple-600 text-white border-purple-600",
  },
  {
    value: "READY_FOR_PICKUP",
    label: "Ready",
    icon: <Package className="h-3.5 w-3.5" />,
    color: "border-indigo-300 text-indigo-700 hover:bg-indigo-50",
    activeColor: "bg-indigo-600 text-white border-indigo-600",
  },
  {
    value: "OUT_FOR_DELIVERY",
    label: "Out for delivery",
    icon: <Truck className="h-3.5 w-3.5" />,
    color: "border-cyan-300 text-cyan-700 hover:bg-cyan-50",
    activeColor: "bg-cyan-600 text-white border-cyan-600",
  },
  {
    value: "DELIVERED",
    label: "Delivered",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
    activeColor: "bg-emerald-600 text-white border-emerald-600",
  },
  {
    value: "PICKED_UP",
    label: "Picked up",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
    activeColor: "bg-emerald-600 text-white border-emerald-600",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "border-destructive/40 text-destructive hover:bg-destructive/5",
    activeColor: "bg-destructive text-white border-destructive",
  },
];

const STATUS_BADGE: Record<string, string> = {
  PAYMENT_PENDING: "bg-orange-100 text-orange-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  READY_FOR_PICKUP: "bg-indigo-100 text-indigo-700",
  OUT_FOR_DELIVERY: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  PICKED_UP: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  const activeStatus = (query.status ?? "ALL") as OrderStatus;
  const orders = await getOrderHistory(
    activeStatus === "ALL" ? undefined : activeStatus,
  );

  return (
    <AdminPage
      title="Order History"
      description="The latest 200 orders, including completed and cancelled."
    >
      <Notice {...query} />

      {/* Status Filter Tabs */}
      <div className="mb-6 space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Filter by status
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = activeStatus === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/admin/orders?status=${tab.value}`}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-all duration-150 ${
                  isActive ? tab.activeColor : `bg-white ${tab.color}`
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.icon}
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Orders Table / Empty State */}
      {orders.length === 0 ? (
        <Empty>No orders match this filter.</Empty>
      ) : (
        <div className="space-y-3">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-[#E1E3E5] bg-white shadow-xs">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[#E1E3E5] bg-[#F6F6F7]">
                <tr>
                  <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wide text-muted">
                    Order
                  </th>
                  <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wide text-muted">
                    Customer
                  </th>
                  <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wide text-muted">
                    Placed
                  </th>
                  <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wide text-muted">
                    Status
                  </th>
                  <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wide text-muted">
                    Payment
                  </th>
                  <th className="px-5 py-3.5 font-bold text-xs uppercase tracking-wide text-right text-muted">
                    Total
                  </th>
                  <th className="px-5 py-3.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F1F1]">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-[#F9F9F9] transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <Link
                        className="font-extrabold text-primary hover:text-secondary transition-colors"
                        href={`/admin/orders/${order.orderNumber}`}
                      >
                        {order.orderNumber}
                      </Link>
                      <span className="mt-0.5 block text-xs text-muted">
                        {order.fulfillmentType?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="block font-semibold text-foreground">
                        {order.customerName}
                      </span>
                      <span className="block text-xs text-muted">
                        {order.customerEmail}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">
                      {new Date(order.createdAt).toLocaleString("en-CH", {
                        timeZone: "Europe/Zurich",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">
                      {order.payment?.status ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-foreground">
                      {formatMoney(order.totalRappen, "en")}
                    </td>
                    <td className="px-5 py-4">
                      <ChevronRight className="h-4 w-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {orders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.orderNumber}`}>
                <Card className="p-4 border-[#E1E3E5] bg-white hover:bg-[#F9F9F9] transition-colors space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-primary">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">
                      {order.customerName}
                    </span>
                    <span className="font-bold text-foreground">
                      {formatMoney(order.totalRappen, "en")}
                    </span>
                  </div>
                  <div className="text-xs text-muted">
                    {new Date(order.createdAt).toLocaleString("en-CH", {
                      timeZone: "Europe/Zurich",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <p className="text-xs text-muted text-right pt-1">
            {orders.length} orders shown
          </p>
        </div>
      )}
    </AdminPage>
  );
}
