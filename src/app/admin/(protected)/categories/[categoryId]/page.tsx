import { notFound } from "next/navigation";
import { RetailCategoryForm } from "@/components/admin/retail-category-form";
import { categoryHierarchy } from "@/lib/catalog-display";
import { prisma } from "@/server/db";
import { resolvePublicImageUrl } from "@/server/storage/s3";
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ saved?: string; error?: string; deleted?: string }>;
}) {
  const [{ categoryId }, feedback] = await Promise.all([params, searchParams]);
  const [rows, category] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null },
      select: { id: true, parentId: true, nameEn: true, is_b2b: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    }),
    prisma.category.findFirst({ where: { id: categoryId, deletedAt: null } }),
  ]);
  if (!category) notFound();
  const categories = categoryHierarchy(rows, ({ nameEn }) => nameEn);
  return (
    <RetailCategoryForm
      categories={categories}
      category={{
        ...category,
        imageUrl: resolvePublicImageUrl(category.imageKey),
      }}
      feedback={feedback}
    />
  );
}
