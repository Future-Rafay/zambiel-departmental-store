import Link from "next/link";

import { AdminPage, Empty, Notice } from "@/components/admin/admin-ui";
import { categoryHierarchy } from "@/lib/catalog-display";
import { prisma } from "@/server/db";

function storeMode(value?: string) {
  return value === "b2b" || value === "all" ? value : "b2c";
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; q?: string; storeMode?: string }>;
}) {
  const feedback = await searchParams;
  const mode = storeMode(feedback.storeMode);
  const rows = await prisma.category.findMany({
    where: { deletedAt: null, ...(mode === "all" ? {} : { is_b2b: mode === "b2b" }) },
    select: {
      id: true,
      parentId: true,
      slug: true,
      nameDe: true,
      nameEn: true,
      active: true,
      is_b2b: true,
      _count: {
        select: {
          products: { where: { deletedAt: null } },
          children: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
  const query = feedback.q?.trim().toLocaleLowerCase();
  const categories = categoryHierarchy(rows, ({ nameEn }) => nameEn).filter((category) =>
    !query || [category.nameEn, category.nameDe, category.slug, ...category.path]
      .some((value) => value.toLocaleLowerCase().includes(query)),
  );

  return (
    <AdminPage
      title="Categories"
      description="Manage storefront categories and subcategories."
      actions={<Link href="/admin/categories/new" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-bold text-white">Add category</Link>}
    >
      <Notice saved={feedback.saved} deleted={feedback.deleted} />
      <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <div>
          <label htmlFor="category-search" className="mb-1 block text-xs font-bold text-muted">Name or slug</label>
          <input id="category-search" name="q" defaultValue={feedback.q} className="min-h-11 w-full rounded-lg border bg-white px-3" />
        </div>
        <div>
          <label htmlFor="category-store-mode" className="mb-1 block text-xs font-bold text-muted">Catalog</label>
          <select id="category-store-mode" name="storeMode" defaultValue={mode} className="min-h-11 w-full rounded-lg border bg-white px-3">
            <option value="b2c">B2C</option>
            <option value="b2b">B2B</option>
            <option value="all">All</option>
          </select>
        </div>
        <button className="min-h-11 rounded-lg border bg-white px-5 font-bold">Filter</button>
      </form>
      {categories.length === 0 ? (
        <Empty>No categories match this view.</Empty>
      ) : (
        <div className="grid gap-3">
          {categories.map((category) => (
            <Link key={category.id} href={`/admin/categories/${category.id}`} className="flex min-h-16 flex-col gap-3 rounded-xl border bg-white p-4 hover:border-primary sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0" style={{ paddingInlineStart: `${Math.min(category.depth, 4) * 1.25}rem` }}>
                <strong className="break-words">{category.depth ? <span aria-hidden="true">↳ </span> : null}{category.nameEn}</strong>
                {category.depth ? <p className="mt-1 text-xs text-muted">{category.path.join(" → ")}</p> : null}
                <p className="mt-1 text-xs text-muted">/{category.slug} · {category.active ? "Active" : "Hidden"} · {category.is_b2b ? "B2B" : "B2C"}</p>
              </div>
              <span className="shrink-0 text-sm text-muted">{category._count.products} products · {category._count.children} children</span>
            </Link>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
