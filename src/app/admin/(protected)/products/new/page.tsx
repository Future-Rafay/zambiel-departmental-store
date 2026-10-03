import { RetailProductForm } from "@/components/admin/retail-product-form";
import { categoryHierarchy } from "@/lib/catalog-display";
import { prisma } from "@/server/db";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; warning?: string }>;
}) {
  const feedback = await searchParams;
  const rows = await prisma.category.findMany({ where: { active: true, deletedAt: null }, select: { id: true, parentId: true, nameEn: true, is_b2b: true }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
  const categories = categoryHierarchy(rows, ({ nameEn }) => nameEn);
  return <RetailProductForm categories={categories} feedback={feedback} />;
}
