import Link from "next/link";

import { AdminPage, Empty, Notice } from "@/components/admin/admin-ui";
import { B2bAccessActions } from "@/components/admin/b2b-access-actions";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db";

export const metadata = { title: "Customers" };

const filters = [{ value: "all", label: "All customers" }, { value: "pending", label: "Pending B2B Requests" }, { value: "approved", label: "Approved B2B" }] as const;

function parseFilter(value?: string) {
  return filters.some((filter) => filter.value === value) ? value as typeof filters[number]["value"] : "all";
}

const PAGE_SIZE = 50;

const statusStyles: Record<string, string> = { NONE: "bg-gray-100 text-gray-700", PENDING: "bg-amber-100 text-amber-800", APPROVED: "bg-emerald-100 text-emerald-800", REJECTED: "bg-red-100 text-red-700" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ b2b?: string; page?: string; saved?: string; error?: string }> }) {
  const [query, actor] = await Promise.all([searchParams, getCurrentUser()]);
  const activeFilter = parseFilter(query.b2b);
  const where: Prisma.UserWhereInput = { OR: [{ role: "CUSTOMER" }, ...(actor?.role === "OWNER" ? [{ id: actor.id, role: "OWNER" as const }] : [])], ...(activeFilter === "pending" ? { b2b_status: "PENDING" } : activeFilter === "approved" ? { b2b_status: "APPROVED" } : {}) };
  const total = await prisma.user.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number(query.page) || 1));
  const customers = await prisma.user.findMany({
    where,
    include: { addresses: { where: { isDefault: true }, take: 1 }, _count: { select: { orders: true } } }, orderBy: [{ role: "desc" }, { updatedAt: "desc" }, { id: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
  });
  const pageHref = (target: number) => `/admin/customers?b2b=${activeFilter}&page=${target}`;
  const returnTo = pageHref(page);
  return <AdminPage title="Customers" description="Customer profiles, saved addresses, order history, and B2B access.">
    <Notice {...query} />
    <nav aria-label="Customer filters" className="mb-5 flex flex-wrap gap-2">{filters.map((filter) => <Link key={filter.value} href={`/admin/customers?b2b=${filter.value}`} aria-current={activeFilter === filter.value ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold ${activeFilter === filter.value ? "border-primary bg-primary text-white" : "bg-white hover:border-primary"}`}>{filter.label}</Link>)}</nav>
    {customers.length === 0 ? <Empty>No customer accounts match this filter.</Empty> : <div className="relative overflow-x-auto rounded-card border bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-[#F6F6F7] text-xs uppercase text-muted"><tr><th className="p-4">Customer</th><th className="p-4">Phone</th><th className="p-4">Saved address</th><th className="p-4">Orders</th><th className="p-4">B2B status</th>{actor?.role === "OWNER" ? <th className="p-4 text-right">Actions</th> : null}</tr></thead><tbody className="divide-y">{customers.map((customer) => { const address = customer.addresses[0]; return <tr key={customer.id}><td className="p-4"><Link href={`/admin/customers/${customer.id}`} className="inline-flex min-h-11 items-center font-bold text-primary">{customer.name ?? customer.email}</Link>{customer.role === "OWNER" ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">Owner</span> : null}<br /><a className="inline-flex min-h-11 items-center text-primary" href={`mailto:${customer.email}`}>{customer.email}</a></td><td className="p-4">{customer.phone ?? "—"}</td><td className="p-4">{address ? `${address.street}, ${address.city}, ${address.countryCode}` : "—"}</td><td className="p-4"><Link href={`/admin/customers/${customer.id}`} className="inline-flex min-h-11 min-w-11 items-center font-bold text-primary">{customer._count.orders}</Link></td><td className="p-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[customer.b2b_status] ?? statusStyles.NONE}`}>{customer.b2b_status}</span></td>{actor?.role === "OWNER" ? <td className="p-4"><B2bAccessActions id={customer.id} status={customer.b2b_status} returnTo={returnTo} /></td> : null}</tr>; })}</tbody></table></div>}
    {pageCount > 1 ? <nav aria-label="Customer pages" className="mt-5 flex items-center justify-center gap-3"><Link aria-disabled={page === 1} href={pageHref(Math.max(1, page - 1))} className={`inline-flex min-h-11 items-center border bg-white px-4 text-sm font-bold ${page === 1 ? "pointer-events-none opacity-40" : "hover:border-primary"}`}>Previous</Link><span className="text-sm font-bold">{page} / {pageCount} · {total} customers</span><Link aria-disabled={page === pageCount} href={pageHref(Math.min(pageCount, page + 1))} className={`inline-flex min-h-11 items-center border bg-white px-4 text-sm font-bold ${page === pageCount ? "pointer-events-none opacity-40" : "hover:border-primary"}`}>Next</Link></nav> : null}
  </AdminPage>;
}
