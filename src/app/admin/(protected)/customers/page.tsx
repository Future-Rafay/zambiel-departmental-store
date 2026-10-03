import Link from "next/link";

import { AdminPage, Empty, Notice } from "@/components/admin/admin-ui";
import { B2bAccessActions } from "@/components/admin/b2b-access-actions";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db";

const filters = [{ value: "all", label: "All customers" }, { value: "pending", label: "Pending B2B Requests" }, { value: "approved", label: "Approved B2B" }] as const;

function parseFilter(value?: string) {
  return filters.some((filter) => filter.value === value) ? value as typeof filters[number]["value"] : "all";
}

const statusStyles: Record<string, string> = { NONE: "bg-gray-100 text-gray-700", PENDING: "bg-amber-100 text-amber-800", APPROVED: "bg-emerald-100 text-emerald-800", REJECTED: "bg-red-100 text-red-700" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ b2b?: string; saved?: string; error?: string }> }) {
  const [query, actor] = await Promise.all([searchParams, getCurrentUser()]);
  const activeFilter = parseFilter(query.b2b);
  const customers = await prisma.user.findMany({
    where: { OR: [{ role: "CUSTOMER" }, ...(actor?.role === "OWNER" ? [{ id: actor.id, role: "OWNER" as const }] : [])], ...(activeFilter === "pending" ? { b2b_status: "PENDING" } : activeFilter === "approved" ? { b2b_status: "APPROVED" } : {}) },
    include: { addresses: { where: { isDefault: true }, take: 1 }, _count: { select: { orders: true } } }, orderBy: [{ role: "desc" }, { updatedAt: "desc" }], take: 500,
  });
  const returnTo = `/admin/customers?b2b=${activeFilter}`;
  return <AdminPage title="Customers" description="Customer profiles, saved addresses, order history, and B2B access.">
    <Notice {...query} />
    <nav aria-label="Customer filters" className="mb-5 flex flex-wrap gap-2">{filters.map((filter) => <Link key={filter.value} href={`/admin/customers?b2b=${filter.value}`} aria-current={activeFilter === filter.value ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold ${activeFilter === filter.value ? "border-primary bg-primary text-white" : "bg-white hover:border-primary"}`}>{filter.label}</Link>)}</nav>
    {customers.length === 0 ? <Empty>No customer accounts match this filter.</Empty> : <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-[#F6F6F7] text-xs uppercase text-muted"><tr><th className="p-4">Customer</th><th className="p-4">Phone</th><th className="p-4">Saved address</th><th className="p-4">Orders</th><th className="p-4">B2B status</th>{actor?.role === "OWNER" ? <th className="p-4 text-right">Actions</th> : null}</tr></thead><tbody className="divide-y">{customers.map((customer) => { const address = customer.addresses[0]; return <tr key={customer.id}><td className="p-4"><Link href={`/admin/customers/${customer.id}`} className="font-bold text-primary">{customer.name ?? customer.email}</Link>{customer.role === "OWNER" ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">Owner</span> : null}<br /><a className="text-primary" href={`mailto:${customer.email}`}>{customer.email}</a></td><td className="p-4">{customer.phone ?? "—"}</td><td className="p-4">{address ? `${address.street}, ${address.city}, ${address.countryCode}` : "—"}</td><td className="p-4"><Link href={`/admin/customers/${customer.id}`} className="font-bold text-primary">{customer._count.orders}</Link></td><td className="p-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[customer.b2b_status] ?? statusStyles.NONE}`}>{customer.b2b_status}</span></td>{actor?.role === "OWNER" ? <td className="p-4"><B2bAccessActions id={customer.id} status={customer.b2b_status} returnTo={returnTo} /></td> : null}</tr>; })}</tbody></table></div>}
  </AdminPage>;
}
