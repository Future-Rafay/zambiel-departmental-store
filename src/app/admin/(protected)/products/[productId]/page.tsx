import { notFound } from "next/navigation";
import { RetailProductForm } from "@/components/admin/retail-product-form";
import { prisma } from "@/server/db";
import { resolveProductMediaUrl, resolvePublicImageUrl } from "@/server/storage/s3";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [{ productId }, feedback] = await Promise.all([params, searchParams]);
  const [categories, product] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, nameEn: true, parent: { select: { nameEn: true } } },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    }),
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        tags: { select: { name: true }, orderBy: { name: "asc" } },
        media: { orderBy: { sortOrder: "asc" } },
        variants: {
          include: {
            optionValues: {
              include: { optionValue: { include: { option: true } } },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  ]);
  if (!product) notFound();
  return (
    <RetailProductForm
      categories={categories}
      product={{
        ...product,
        imageUrl: resolvePublicImageUrl(product.imageKey),
        media: product.media.map((media) => ({
          ...media,
          imageUrl: resolveProductMediaUrl(media),
        })),
      }}
      feedback={feedback}
    />
  );
}
