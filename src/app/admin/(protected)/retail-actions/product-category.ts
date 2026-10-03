"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { categoryModeBlock, optionalText, productTagNames } from "@/app/admin/(protected)/retail-actions/shared";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/server/auth/current-user";
import { prisma } from "@/server/db";
import { sanitizeProductDescription, slugify } from "@/server/import/shopify-csv";
import { getProductUploadPublicPrefix } from "@/server/storage/s3";

const productInput = z.object({
  id: z.string().optional(), categoryId: z.string().min(1), slug: z.string().min(1).max(191),
  nameEn: z.string().min(1).max(200), nameDe: z.string().max(200),
  descriptionEn: z.string().max(200_000), descriptionDe: z.string().max(200_000),
  imageKey: z.string().max(512).nullable(), status: z.enum(["DRAFT", "ACTIVE"]),
  seoTitleEn: z.string().max(200), seoTitleDe: z.string().max(200),
  seoDescriptionEn: z.string().max(500), seoDescriptionDe: z.string().max(500), featured: z.boolean(), is_b2b: z.boolean(),
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
    is_b2b: formData.get("is_b2b") === "on",
  });
  if (input.status === "ACTIVE" && (!input.nameDe || !input.descriptionDe.trim())) throw new Error("GERMAN_COPY_REQUIRED");
  const [category, slugConflict, existing] = await Promise.all([
    prisma.category.findFirst({ where: { id: input.categoryId, deletedAt: null }, select: { is_b2b: true } }),
    prisma.product.findFirst({ where: { slug: input.slug, ...(input.id ? { id: { not: input.id } } : {}) }, select: { id: true } }),
    input.id ? prisma.product.findUnique({ where: { id: input.id }, select: { publishedAt: true } }) : Promise.resolve(null),
  ]);
  if (!category || category.is_b2b !== input.is_b2b) redirect(`${input.id ? `/admin/products/${input.id}` : "/admin/products/new"}?error=PRODUCT_CATEGORY_MODE_MISMATCH`);
  if (slugConflict) redirect(`${input.id ? `/admin/products/${input.id}` : "/admin/products/new"}?error=PRODUCT_SLUG_TAKEN`);
  const data = {
    categoryId: input.categoryId,
    slug: input.slug,
    nameEn: input.nameEn,
    nameDe: input.nameDe,
    descriptionEn: optionalText(sanitizeProductDescription(input.descriptionEn, new Map(), [getProductUploadPublicPrefix()])),
    descriptionDe: optionalText(sanitizeProductDescription(input.descriptionDe, new Map(), [getProductUploadPublicPrefix()])),
    imageKey: input.imageKey,
    status: input.status,
    active: input.status === "ACTIVE",
    available: input.status === "ACTIVE",
    featured: input.featured,
    is_b2b: input.is_b2b,
    seoTitleEn: optionalText(input.seoTitleEn),
    seoTitleDe: optionalText(input.seoTitleDe),
    seoDescriptionEn: optionalText(input.seoDescriptionEn),
    seoDescriptionDe: optionalText(input.seoDescriptionDe),
    publishedAt: input.status === "ACTIVE" ? (existing?.publishedAt ?? new Date()) : null,
  };
  const tags = await Promise.all(productTagNames(String(formData.get("tags") ?? "")).map(({ slug, name }) => prisma.productTag.upsert({ where: { slug }, update: { name }, create: { name, slug }, select: { id: true } })));
  let product;
  try {
    product = input.id
      ? await prisma.product.update({ where: { id: input.id }, data: { ...data, tags: { set: tags } } })
      : await prisma.product.create({ data: { ...data, tags: { connect: tags }, variants: { create: { nameEn: "Default", nameDe: "Standard", priceRappen: 0, stockOnHand: 0, lowStockThreshold: 5 } } } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirect(`${input.id ? `/admin/products/${input.id}` : "/admin/products/new"}?error=PRODUCT_SLUG_TAKEN`);
    throw error;
  }
  let warning = "";
  try {
    await prisma.auditLog.create({ data: { actorUserId: actor.id, action: input.id ? "PRODUCT_UPDATED" : "PRODUCT_CREATED", entityType: "Product", entityId: product.id } });
  } catch (error) {
    console.error("Product saved but audit logging failed", { productId: product.id, error });
    warning = "&warning=CATALOG_AUDIT_FAILED";
  }
  revalidatePath("/admin/products");
  revalidatePath("/de");
  revalidatePath("/en");
  redirect(`/admin/products/${product.id}?saved=1${warning}`);
}

export async function deleteRetailProduct(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { status: "ARCHIVED", active: false, available: false, deletedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorUserId: actor.id, action: "PRODUCT_DELETED", entityType: "Product", entityId: id } }),
  ]);
  revalidatePath("/admin/products");
  redirect("/admin/products?deleted=product");
}

const categoryInput = z.object({
  id: z.string().optional(), nameEn: z.string().min(1).max(120), nameDe: z.string().max(120),
  slug: z.string().min(1).max(191), parentId: z.string().nullable(),
  descriptionEn: z.string().max(10_000), descriptionDe: z.string().max(10_000), imageKey: z.string().max(512).nullable(),
  seoTitleEn: z.string().max(180), seoTitleDe: z.string().max(180),
  seoDescriptionEn: z.string().max(500), seoDescriptionDe: z.string().max(500), active: z.boolean(), is_b2b: z.boolean(),
});

export async function deleteRetailCategory(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  const [products, children] = await Promise.all([
    prisma.product.count({ where: { categoryId: id, status: "ACTIVE", deletedAt: null } }),
    prisma.category.count({ where: { parentId: id, active: true, deletedAt: null } }),
  ]);
  if (products || children) redirect(`/admin/categories/${id}?error=CATEGORY_STILL_IN_USE`);
  await prisma.$transaction([
    prisma.category.update({ where: { id }, data: { active: false, deletedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorUserId: actor.id, action: "CATEGORY_DELETED", entityType: "Category", entityId: id } }),
  ]);
  revalidatePath("/admin/categories");
  redirect("/admin/categories?deleted=category");
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
    seoDescriptionDe: String(formData.get("seoDescriptionDe") ?? ""), active: formData.get("active") === "on", is_b2b: formData.get("is_b2b") === "on",
  });
  if (input.id && input.parentId === input.id) throw new Error("CATEGORY_CANNOT_PARENT_ITSELF");
  if (input.parentId) {
    const parent = await prisma.category.findFirst({ where: { id: input.parentId, deletedAt: null }, select: { is_b2b: true } });
    if (!parent || parent.is_b2b !== input.is_b2b) redirect(`${input.id ? `/admin/categories/${input.id}` : "/admin/categories/new"}?error=CATEGORY_PARENT_MODE_MISMATCH`);
  }
  if (input.id) {
    const [children, products] = await Promise.all([
      prisma.category.count({ where: { parentId: input.id, deletedAt: null, is_b2b: { not: input.is_b2b } } }),
      prisma.product.count({ where: { categoryId: input.id, deletedAt: null, is_b2b: { not: input.is_b2b } } }),
    ]);
    const block = categoryModeBlock(children, products);
    if (block) redirect(`/admin/categories/${input.id}?error=${block}`);
  }
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
    seoDescriptionEn: optionalText(input.seoDescriptionEn), seoDescriptionDe: optionalText(input.seoDescriptionDe), active: input.active, is_b2b: input.is_b2b,
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
