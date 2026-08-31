import Link from "next/link";
import { ArrowRight, Banknote, Clock3, Package, ShoppingBag } from "lucide-react";

import { AdminPage, Empty } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/orders";
import { getDashboardData } from "@/server/services/admin";

export default async function AdminDashboardPage() {
  const dashboard = await getDashboardData();
  const metrics = [
    { label: "Paid net revenue", value: formatMoney(dashboard.revenueRappen, "en"), detail: undefined, icon: Banknote },
    { label: "Total orders", value: dashboard.totalOrders.toLocaleString("en-CH"), detail: undefined, icon: ShoppingBag },
    { label: "Products", value: dashboard.totalProducts.toLocaleString("en-CH"), detail: `${dashboard.lowStock} low-stock variants`, icon: Package },
    { label: "Active orders", value: dashboard.activeOrders.toLocaleString("en-CH"), detail: `${dashboard.pendingStripe} awaiting Stripe`, icon: Clock3 },
  ];
  return <AdminPage title="Dashboard" description="Store performance and the newest orders.">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, detail, icon: Icon }) => <Card key={label} className="flex items-center gap-4 p-5"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Icon aria-hidden="true" className="size-5" /></span><div><p className="text-xs font-semibold text-muted">{label}</p><p className="font-display text-2xl font-bold">{value}</p>{detail && <p className="text-xs text-muted">{detail}</p>}</div></Card>)}</div>
    <section className="mt-7" aria-labelledby="recent-orders"><div className="mb-3 flex items-center justify-between"><h2 id="recent-orders" className="font-display text-xl font-bold">Recent orders</h2><Link href="/admin/orders" className="text-sm font-semibold text-primary hover:underline">View all</Link></div>
      {dashboard.recentOrders.length === 0 ? <Empty>No orders yet.</Empty> : <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b bg-[#F6F6F7] text-xs uppercase text-muted"><tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Status</th><th className="p-4">Placed</th><th className="p-4 text-right">Total</th><th className="p-4"><span className="sr-only">Details</span></th></tr></thead><tbody className="divide-y">{dashboard.recentOrders.map((order) => <tr key={order.id}><td className="p-4 font-bold text-primary">{order.orderNumber}</td><td className="p-4">{order.customerName}</td><td className="p-4 text-xs font-semibold">{order.status.replaceAll("_", " ")}</td><td className="p-4 text-xs text-muted">{new Date(order.createdAt).toLocaleString("en-CH", { timeZone: "Europe/Zurich", dateStyle: "medium", timeStyle: "short" })}</td><td className="p-4 text-right font-bold">{formatMoney(order.totalRappen, "en")}</td><td className="p-4"><Link href={`/admin/orders/${order.orderNumber}`} aria-label={`View ${order.orderNumber}`} className="text-primary"><ArrowRight className="size-4" /></Link></td></tr>)}</tbody></table></div>}
    </section>
  </AdminPage>;
}
