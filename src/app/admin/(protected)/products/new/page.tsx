import { RetailProductForm } from "@/components/admin/retail-product-form";
import { prisma } from "@/server/db";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; warning?: string }>;
}) {
  const feedback = await searchParams;
  const categories = await prisma.category.findMany({ where: { active: true, deletedAt: null }, select: { id: true, nameEn: true, is_b2b: true, parent: { select: { nameEn: true } } }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
  return <RetailProductForm categories={categories} feedback={feedback} />;
}
