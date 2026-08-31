import { RetailProductForm } from "@/components/admin/retail-product-form";
import { prisma } from "@/server/db";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({ where: { active: true }, select: { id: true, nameEn: true, parent: { select: { nameEn: true } } }, orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
  return <RetailProductForm categories={categories} />;
}
