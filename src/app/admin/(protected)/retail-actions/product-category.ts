"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { optionalText } from "@/app/admin/(protected)/retail-actions/shared";
import { requireRole } from "@/server/auth/current-user";
import { prisma } from "@/server/db";
import { sanitizeProductDescription, slugify } from "@/server/import/shopify-csv";

const productInput = z.object({
  id: z.string().optional(), categoryId: z.string().min(1), slug: z.string().min(1).max(191),
  nameEn: z.string().min(1).max(200), nameDe: z.string().max(200),
  descriptionEn: z.string().max(200_000), descriptionDe: z.string().max(200_000),
  imageKey: z.string().max(512).nullable(), status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  seoTitleEn: z.string().max(200), seoTitleDe: z.string().max(200),
  seoDescriptionEn: z.string().max(500), seoDescriptionDe: z.string().max(500), featured: z.boolean(),
});

export async function saveRetailProduct(formData: FormData) {
  const actor = await requireRole("OWNER");
  const input = productInput.parse({
    id: optionalText(formData.get("id")) ?? undefined,
    categoryId: formData.get("categoryId"),
    slug: slugify(String(formData.get("slug") ?? "")),
    nameEn: String(formData.get("nameEn") ?? "").trim(),
    nameDe: String(formData.get("nameDe") ?? "").trim(),
    descriptionEn: String(formData.get("descriptionEn") ?? ""),
    descriptionDe: String(formData.get("descriptionDe") ?? ""),
    imageKey: optionalText(formData.get("imageKey")),
    status: formData.get("status"),
    seoTitleEn: String(formData.get("seoTitleEn") ?? ""),
    seoTitleDe: String(formData.get("seoTitleDe") ?? ""),
    seoDescriptionEn: String(formData.get("seoDescriptionEn") ?? ""),
    seoDescriptionDe: String(formData.get("seoDescriptionDe") ?? ""),
    featured: formData.get("featured") === "on",
  });
  if (input.status === "ACTIVE" && (!input.nameDe || !input.descriptionDe.trim())) throw new Error("GERMAN_COPY_REQUIRED");
  const existing = input.id ? await prisma.product.findUnique({ where: { id: input.id }, select: { publishedAt: true } }) : null;
  const data = {
    categoryId: input.categoryId,
    slug: input.slug,
    nameEn: input.nameEn,
    nameDe: input.nameDe,
    descriptionEn: optionalText(sanitizeProductDescription(input.descriptionEn)),
    descriptionDe: optionalText(sanitizeProductDescription(input.descriptionDe)),
    imageKey: input.imageKey,
    status: input.status,
    active: input.status === "ACTIVE",
    available: input.status === "ACTIVE",
    featured: input.featured,
    seoTitleEn: optionalText(input.seoTitleEn),
    seoTitleDe: optionalText(input.seoTitleDe),
    seoDescriptionEn: optionalText(input.seoDescriptionEn),
    seoDescriptionDe: optionalText(input.seoDescriptionDe),
    publishedAt: input.status === "ACTIVE" ? (existing?.publishedAt ?? new Date()) : null,
  };
  const product = await prisma.$transaction(async (tx) => {
    const saved = input.id ? await tx.product.update({ where: { id: input.id }, data }) : await tx.product.create({ data });
    if (!input.id) await tx.productVariant.create({ data: { productId: saved.id, nameEn: "Default", nameDe: "Standard", priceRappen: 0, stockOnHand: 0, lowStockThreshold: 5 } });
    const tagNames = [...new Set(String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean))];
    const tags = [];
    for (const name of tagNames) {
      const slug = slugify(name);
      if (slug) tags.push(await tx.productTag.upsert({ where: { slug }, update: { name }, create: { name, slug }, select: { id: true } }));
    }
    await tx.product.update({ where: { id: saved.id }, data: { tags: { set: tags } } });
    await tx.auditLog.create({ data: { actorUserId: actor.id, action: input.id ? "PRODUCT_UPDATED" : "PRODUCT_CREATED", entityType: "Product", entityId: saved.id } });
    return saved;
  });
  revalidatePath("/admin/products");
  revalidatePath("/de");
  revalidatePath("/en");
  redirect(`/admin/products/${product.id}?saved=1`);
}

export async function archiveRetailProduct(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { status: "ARCHIVED", active: false, available: false } }),
    prisma.auditLog.create({ data: { actorUserId: actor.id, action: "PRODUCT_ARCHIVED", entityType: "Product", entityId: id } }),
  ]);
  revalidatePath("/admin/products");
  redirect("/admin/products?saved=1");
}

const categoryInput = z.object({
  id: z.string().optional(), nameEn: z.string().min(1).max(120), nameDe: z.string().max(120),
  slug: z.string().min(1).max(191), parentId: z.string().nullable(),
  descriptionEn: z.string().max(10_000), descriptionDe: z.string().max(10_000), imageKey: z.string().max(512).nullable(),
  seoTitleEn: z.string().max(180), seoTitleDe: z.string().max(180),
  seoDescriptionEn: z.string().max(500), seoDescriptionDe: z.string().max(500), active: z.boolean(),
});

export async function archiveRetailCategory(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  const [products, children] = await Promise.all([
    prisma.product.count({ where: { categoryId: id, status: "ACTIVE", deletedAt: null } }),
    prisma.category.count({ where: { parentId: id, active: true, deletedAt: null } }),
  ]);
  if (products || children) throw new Error("CATEGORY_STILL_IN_USE");
  await prisma.$transaction([
    prisma.category.update({ where: { id }, data: { active: false, deletedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorUserId: actor.id, action: "CATEGORY_ARCHIVED", entityType: "Category", entityId: id } }),
  ]);
  revalidatePath("/admin/categories");
  redirect("/admin/categories?saved=1");
}

export async function saveRetailCategory(formData: FormData) {
  const actor = await requireRole("OWNER");
  const input = categoryInput.parse({
    id: optionalText(formData.get("id")) ?? undefined,
    nameEn: String(formData.get("nameEn") ?? "").trim(), nameDe: String(formData.get("nameDe") ?? "").trim(),
    slug: slugify(String(formData.get("slug") ?? "")), parentId: optionalText(formData.get("parentId")),
    descriptionEn: String(formData.get("descriptionEn") ?? ""), descriptionDe: String(formData.get("descriptionDe") ?? ""),
    imageKey: optionalText(formData.get("imageKey")), seoTitleEn: String(formData.get("seoTitleEn") ?? ""),
    seoTitleDe: String(formData.get("seoTitleDe") ?? ""), seoDescriptionEn: String(formData.get("seoDescriptionEn") ?? ""),
    seoDescriptionDe: String(formData.get("seoDescriptionDe") ?? ""), active: formData.get("active") === "on",
  });
  if (input.id && input.parentId === input.id) throw new Error("CATEGORY_CANNOT_PARENT_ITSELF");
  if (input.id && input.parentId) {
    const seen = new Set<string>();
    let cursor: string | null = input.parentId;
    while (cursor && !seen.has(cursor)) {
      if (cursor === input.id) throw new Error("CATEGORY_CYCLE");
      seen.add(cursor);
      cursor = (await prisma.category.findUnique({ where: { id: cursor }, select: { parentId: true } }))?.parentId ?? null;
    }
  }
  const data = {
    nameEn: input.nameEn, nameDe: input.nameDe, slug: input.slug, parentId: input.parentId,
    descriptionEn: optionalText(input.descriptionEn), descriptionDe: optionalText(input.descriptionDe), imageKey: input.imageKey,
    seoTitleEn: optionalText(input.seoTitleEn), seoTitleDe: optionalText(input.seoTitleDe),
    seoDescriptionEn: optionalText(input.seoDescriptionEn), seoDescriptionDe: optionalText(input.seoDescriptionDe), active: input.active,
  };
  const category = await prisma.$transaction(async (tx) => {
    const saved = input.id ? await tx.category.update({ where: { id: input.id }, data }) : await tx.category.create({ data });
    await tx.auditLog.create({ data: { actorUserId: actor.id, action: input.id ? "CATEGORY_UPDATED" : "CATEGORY_CREATED", entityType: "Category", entityId: saved.id } });
    return saved;
  });
  revalidatePath("/admin/categories");
  revalidatePath("/de");
  revalidatePath("/en");
  redirect(`/admin/categories/${category.id}?saved=1`);
}
