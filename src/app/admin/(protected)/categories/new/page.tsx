import { RetailCategoryForm } from "@/components/admin/retail-category-form";
import { prisma } from "@/server/db";
export default async function NewCategoryPage() { const categories = await prisma.category.findMany({ select: { id: true, nameEn: true }, orderBy: { nameEn: "asc" } }); return <RetailCategoryForm categories={categories} />; }
