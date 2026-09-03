import Link from "next/link";
import { AdminPage, Empty, Notice } from "@/components/admin/admin-ui";
import { prisma } from "@/server/db";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const [categories, feedback] = await Promise.all([prisma.category.findMany({ where: { deletedAt: null }, include: { parent: true, _count: { select: { products: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } } } }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] }), searchParams]);
  return <AdminPage title="Categories" description="Manage storefront categories and subcategories." actions={<Link href="/admin/categories/new" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-bold text-white">Add category</Link>}><Notice saved={feedback.saved} deleted={feedback.deleted} />{categories.length === 0 ? <Empty>No categories yet.</Empty> : <div className="grid gap-3">{categories.map((category) => <Link key={category.id} href={`/admin/categories/${category.id}`} className="flex min-h-16 items-center justify-between rounded-xl border bg-white p-4 hover:border-primary"><div><strong>{category.parent ? `${category.parent.nameEn} / ` : ""}{category.nameEn}</strong><p className="text-xs text-muted">/{category.slug} · {category.active ? "Active" : "Hidden"}</p></div><span className="text-sm text-muted">{category._count.products} products · {category._count.children} children</span></Link>)}</div>}</AdminPage>;
}
