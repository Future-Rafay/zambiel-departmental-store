import { RetailCategoryForm } from "@/components/admin/retail-category-form";
import { categoryHierarchy } from "@/lib/catalog-display";
import { prisma } from "@/server/db";
export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const feedback = await searchParams;
  const rows = await prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, parentId: true, nameEn: true, is_b2b: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
  const categories = categoryHierarchy(rows, ({ nameEn }) => nameEn);
  return <RetailCategoryForm categories={categories} feedback={feedback} />;
}
