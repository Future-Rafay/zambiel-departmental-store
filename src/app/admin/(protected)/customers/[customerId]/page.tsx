import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, Empty } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { formatMoney, formatOrderNumber } from "@/lib/orders";
import { prisma } from "@/server/db";

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const customer = await prisma.user.findFirst({ where: { id: customerId, role: "CUSTOMER" }, include: { address: true, orders: { orderBy: { createdAt: "desc" }, take: 100 } } });
  if (!customer) notFound();
  return <AdminPage title={customer.name ?? customer.email} description="Profile, single saved address, and order history."><div className="grid gap-5 lg:grid-cols-3"><Card className="p-5"><h2 className="font-display text-xl font-bold">Profile</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="font-bold">Email</dt><dd><a href={`mailto:${customer.email}`} className="text-primary">{customer.email}</a></dd></div><div><dt className="font-bold">Phone</dt><dd>{customer.phone ?? "—"}</dd></div></dl>{customer.address ? <address className="mt-5 border-t pt-4 text-sm not-italic">{customer.address.street}{customer.address.streetExtra ? <><br />{customer.address.streetExtra}</> : null}<br />{customer.address.postalCode} {customer.address.city}<br />{customer.address.countryCode}</address> : <p className="mt-5 border-t pt-4 text-sm text-muted">No saved address.</p>}</Card><div className="lg:col-span-2"><h2 className="mb-3 font-display text-xl font-bold">Orders</h2>{customer.orders.length ? <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b"><th className="p-4">Order</th><th className="p-4">Status</th><th className="p-4">Placed</th><th className="p-4 text-right">Total</th></tr></thead><tbody className="divide-y">{customer.orders.map((order) => <tr key={order.id.toString()}><td className="p-4"><Link href={`/admin/orders/${formatOrderNumber(order.id)}`} className="font-bold text-primary">{formatOrderNumber(order.id)}</Link></td><td className="p-4">{order.status.replaceAll("_", " ")}</td><td className="p-4">{order.createdAt.toLocaleDateString("en-CH", { timeZone: "Europe/Zurich" })}</td><td className="p-4 text-right font-bold">{formatMoney(order.totalRappen, "en")}</td></tr>)}</tbody></table></div> : <Empty>No orders for this customer.</Empty>}</div></div></AdminPage>;
}
