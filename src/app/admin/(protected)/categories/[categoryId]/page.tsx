import { notFound } from "next/navigation";
import { RetailCategoryForm } from "@/components/admin/retail-category-form";
import { prisma } from "@/server/db";
import { resolvePublicImageUrl } from "@/server/storage/s3";
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [{ categoryId }, feedback] = await Promise.all([params, searchParams]);
  const [categories, category] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, nameEn: true },
      orderBy: { nameEn: "asc" },
    }),
    prisma.category.findUnique({ where: { id: categoryId } }),
  ]);
  if (!category) notFound();
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
