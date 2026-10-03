import { RetailCategoryForm } from "@/components/admin/retail-category-form";
import { prisma } from "@/server/db";
export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const feedback = await searchParams;
  const categories = await prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, nameEn: true, is_b2b: true }, orderBy: { nameEn: "asc" } });
  return <RetailCategoryForm categories={categories} feedback={feedback} />;
}
