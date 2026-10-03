import Link from "next/link";

import { AdminPage, Empty, Notice } from "@/components/admin/admin-ui";
import { categoryHierarchy } from "@/lib/catalog-display";
import { prisma } from "@/server/db";

function storeMode(value?: string) {
  return value === "b2b" || value === "all" ? value : "b2c";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    deleted?: string;
    q?: string;
    status?: "DRAFT" | "ACTIVE";
    storeMode?: string;
    categoryId?: string;
  }>;
}) {
  const filters = await searchParams;
  const mode = storeMode(filters.storeMode);
  const categoryRows = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, parentId: true, nameEn: true, is_b2b: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
  const hierarchy = categoryHierarchy(categoryRows, ({ nameEn }) => nameEn);
  const categories = hierarchy.filter((category) => mode === "all" || category.is_b2b === (mode === "b2b"));
  const selectedCategory = categories.find(({ id }) => id === filters.categoryId);
  const categoryIds = selectedCategory ? [selectedCategory.id, ...selectedCategory.descendantIds] : undefined;
  const categoryById = new Map(hierarchy.map((category) => [category.id, category]));
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(mode === "all" ? {} : { is_b2b: mode === "b2b" }),
      ...(filters.status ? { status: filters.status } : {}),
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      ...(filters.q ? {
        OR: [
          { nameEn: { contains: filters.q } },
          { nameDe: { contains: filters.q } },
          { variants: { some: { sku: { contains: filters.q }, deletedAt: null } } },
        ],
      } : {}),
    },
    select: {
      id: true,
      slug: true,
      nameEn: true,
      status: true,
      is_b2b: true,
      category: { select: { id: true, nameEn: true } },
      variants: { where: { deletedAt: null }, select: { stockOnHand: true, stockReserved: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });

  return (
    <AdminPage
      title="Products"
      description="Catalog publication, variants, pricing, and stock."
      actions={<Link href="/admin/products/new" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-bold text-white">Add product</Link>}
    >
      <Notice saved={filters.saved} deleted={filters.deleted} />
      <form className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_8rem_minmax(0,18rem)_10rem_auto] xl:items-end">
        <div>
          <label htmlFor="product-search" className="mb-1 block text-xs font-bold text-muted">Name or SKU</label>
          <input id="product-search" name="q" defaultValue={filters.q} className="min-h-11 w-full rounded-lg border bg-white px-3" />
        </div>
        <div>
          <label htmlFor="product-store-mode" className="mb-1 block text-xs font-bold text-muted">Catalog</label>
          <select id="product-store-mode" name="storeMode" defaultValue={mode} className="min-h-11 w-full rounded-lg border bg-white px-3">
            <option value="b2c">B2C</option>
            <option value="b2b">B2B</option>
            <option value="all">All</option>
          </select>
        </div>
        <div>
          <label htmlFor="product-category" className="mb-1 block text-xs font-bold text-muted">Category</label>
          <select id="product-category" name="categoryId" defaultValue={selectedCategory?.id ?? ""} className="min-h-11 w-full rounded-lg border bg-white px-3">
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.path.join(" → ")}{mode === "all" ? ` (${category.is_b2b ? "B2B" : "B2C"})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="product-status" className="mb-1 block text-xs font-bold text-muted">Publication state</label>
          <select id="product-status" name="status" defaultValue={filters.status ?? ""} className="min-h-11 w-full rounded-lg border bg-white px-3">
            <option value="">All states</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
          </select>
        </div>
        <button className="min-h-11 rounded-lg border bg-white px-5 font-bold md:col-span-2 xl:col-span-1">Filter</button>
      </form>
      {products.length === 0 ? (
        <Empty>No products match this view.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b bg-[#F6F6F7] text-xs uppercase text-muted">
              <tr><th className="p-4">Product</th><th className="p-4">Catalog</th><th className="p-4">Category</th><th className="p-4">State</th><th className="p-4">Variants</th><th className="p-4">Available stock</th><th className="p-4"><span className="sr-only">Edit</span></th></tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => {
                const category = categoryById.get(product.category.id);
                return (
                  <tr key={product.id}>
                    <td className="p-4"><strong>{product.nameEn}</strong><div className="text-xs text-muted">/{product.slug}</div></td>
                    <td className="p-4">{product.is_b2b ? "B2B" : "B2C"}</td>
                    <td className="p-4">{category?.path.join(" → ") ?? product.category.nameEn}</td>
                    <td className="p-4">{product.status}</td>
                    <td className="p-4">{product.variants.length}</td>
                    <td className="p-4">{product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stockOnHand - variant.stockReserved), 0)}</td>
                    <td className="p-4 text-right"><Link href={`/admin/products/${product.id}`} className="font-bold text-primary hover:underline">Edit</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}
