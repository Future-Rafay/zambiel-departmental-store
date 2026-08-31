"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/current-user";
import { advanceOrder } from "@/server/services/ordering";
import {
  sanitizeProductDescription,
  slugify,
} from "@/server/import/shopify-csv";

const optionalText = (value: FormDataEntryValue | null) =>
  String(value ?? "").trim() || null;
const productInput = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  slug: z.string().min(1).max(191),
  nameEn: z.string().min(1).max(200),
  nameDe: z.string().max(200),
  descriptionEn: z.string().max(200_000),
  descriptionDe: z.string().max(200_000),
  imageKey: z.string().max(512).nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  seoTitleEn: z.string().max(200),
  seoTitleDe: z.string().max(200),
  seoDescriptionEn: z.string().max(500),
  seoDescriptionDe: z.string().max(500),
  featured: z.boolean(),
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
  if (
    input.status === "ACTIVE" &&
    (!input.nameDe || !input.descriptionDe.trim())
  )
    throw new Error("GERMAN_COPY_REQUIRED");
  const existing = input.id
    ? await prisma.product.findUnique({
        where: { id: input.id },
        select: { publishedAt: true },
      })
    : null;
  const data = {
    categoryId: input.categoryId,
    slug: input.slug,
    nameEn: input.nameEn,
    nameDe: input.nameDe,
    descriptionEn: optionalText(
      sanitizeProductDescription(input.descriptionEn),
    ),
    descriptionDe: optionalText(
      sanitizeProductDescription(input.descriptionDe),
    ),
    imageKey: input.imageKey,
    status: input.status,
    active: input.status === "ACTIVE",
    available: input.status === "ACTIVE",
    featured: input.featured,
    seoTitleEn: optionalText(input.seoTitleEn),
    seoTitleDe: optionalText(input.seoTitleDe),
    seoDescriptionEn: optionalText(input.seoDescriptionEn),
    seoDescriptionDe: optionalText(input.seoDescriptionDe),
    publishedAt:
      input.status === "ACTIVE" ? (existing?.publishedAt ?? new Date()) : null,
  };
  const product = await prisma.$transaction(async (tx) => {
    const saved = input.id
      ? await tx.product.update({ where: { id: input.id }, data })
      : await tx.product.create({ data });
    if (!input.id)
      await tx.productVariant.create({
        data: {
          productId: saved.id,
          nameEn: "Default",
          nameDe: "Standard",
          priceRappen: 0,
          stockOnHand: 0,
          lowStockThreshold: 5,
        },
      });
    const tagNames = [...new Set(String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean))];
    const tags = [];
    for (const name of tagNames) {
      const slug = slugify(name);
      if (!slug) continue;
      tags.push(await tx.productTag.upsert({ where: { slug }, update: { name }, create: { name, slug }, select: { id: true } }));
    }
    await tx.product.update({ where: { id: saved.id }, data: { tags: { set: tags } } });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: input.id ? "PRODUCT_UPDATED" : "PRODUCT_CREATED",
        entityType: "Product",
        entityId: saved.id,
      },
    });
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
    prisma.product.update({
      where: { id },
      data: { status: "ARCHIVED", active: false, available: false },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "PRODUCT_ARCHIVED",
        entityType: "Product",
        entityId: id,
      },
    }),
  ]);
  revalidatePath("/admin/products");
  redirect("/admin/products?saved=1");
}

export async function archiveRetailCategory(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  const [products, children] = await Promise.all([prisma.product.count({ where: { categoryId: id, status: "ACTIVE", deletedAt: null } }), prisma.category.count({ where: { parentId: id, active: true, deletedAt: null } })]);
  if (products || children) throw new Error("CATEGORY_STILL_IN_USE");
  await prisma.$transaction([prisma.category.update({ where: { id }, data: { active: false, deletedAt: new Date() } }), prisma.auditLog.create({ data: { actorUserId: actor.id, action: "CATEGORY_ARCHIVED", entityType: "Category", entityId: id } })]);
  revalidatePath("/admin/categories");
  redirect("/admin/categories?saved=1");
}

const categoryInput = z.object({
  id: z.string().optional(),
  nameEn: z.string().min(1).max(120),
  nameDe: z.string().max(120),
  slug: z.string().min(1).max(191),
  parentId: z.string().nullable(),
  descriptionEn: z.string().max(10_000),
  descriptionDe: z.string().max(10_000),
  imageKey: z.string().max(512).nullable(),
  seoTitleEn: z.string().max(180),
  seoTitleDe: z.string().max(180),
  seoDescriptionEn: z.string().max(500),
  seoDescriptionDe: z.string().max(500),
  active: z.boolean(),
});
export async function saveRetailCategory(formData: FormData) {
  const actor = await requireRole("OWNER");
  const input = categoryInput.parse({
    id: optionalText(formData.get("id")) ?? undefined,
    nameEn: String(formData.get("nameEn") ?? "").trim(),
    nameDe: String(formData.get("nameDe") ?? "").trim(),
    slug: slugify(String(formData.get("slug") ?? "")),
    parentId: optionalText(formData.get("parentId")),
    descriptionEn: String(formData.get("descriptionEn") ?? ""),
    descriptionDe: String(formData.get("descriptionDe") ?? ""),
    imageKey: optionalText(formData.get("imageKey")),
    seoTitleEn: String(formData.get("seoTitleEn") ?? ""),
    seoTitleDe: String(formData.get("seoTitleDe") ?? ""),
    seoDescriptionEn: String(formData.get("seoDescriptionEn") ?? ""),
    seoDescriptionDe: String(formData.get("seoDescriptionDe") ?? ""),
    active: formData.get("active") === "on",
  });
  if (input.id && input.parentId === input.id)
    throw new Error("CATEGORY_CANNOT_PARENT_ITSELF");
  if (input.id && input.parentId) {
    const seen = new Set<string>();
    let cursor: string | null = input.parentId;
    while (cursor && !seen.has(cursor)) {
      if (cursor === input.id) throw new Error("CATEGORY_CYCLE");
      seen.add(cursor);
      cursor =
        (
          await prisma.category.findUnique({
            where: { id: cursor },
            select: { parentId: true },
          })
        )?.parentId ?? null;
    }
  }
  const data = {
    nameEn: input.nameEn,
    nameDe: input.nameDe,
    slug: input.slug,
    parentId: input.parentId,
    descriptionEn: optionalText(input.descriptionEn),
    descriptionDe: optionalText(input.descriptionDe),
    imageKey: input.imageKey,
    seoTitleEn: optionalText(input.seoTitleEn),
    seoTitleDe: optionalText(input.seoTitleDe),
    seoDescriptionEn: optionalText(input.seoDescriptionEn),
    seoDescriptionDe: optionalText(input.seoDescriptionDe),
    active: input.active,
  };
  const category = await prisma.$transaction(async (tx) => {
    const saved = input.id
      ? await tx.category.update({ where: { id: input.id }, data })
      : await tx.category.create({ data });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: input.id ? "CATEGORY_UPDATED" : "CATEGORY_CREATED",
        entityType: "Category",
        entityId: saved.id,
      },
    });
    return saved;
  });
  revalidatePath("/admin/categories");
  revalidatePath("/de");
  revalidatePath("/en");
  redirect(`/admin/categories/${category.id}?saved=1`);
}

export async function saveRetailVariant(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  const productId = z.string().min(1).parse(formData.get("productId"));
  const priceRappen = z.coerce
    .number()
    .int()
    .min(0)
    .parse(formData.get("priceRappen"));
  const compareAt = optionalText(formData.get("compareAtPriceRappen"));
  const compareAtPriceRappen = compareAt
    ? z.coerce.number().int().gt(priceRappen).parse(compareAt)
    : null;
  await prisma.$transaction([
    prisma.productVariant.update({
      where: { id },
      data: {
        nameEn: z.string().trim().min(1).max(160).parse(formData.get("nameEn")),
        nameDe: z.string().trim().max(160).parse(formData.get("nameDe")),
        sku: optionalText(formData.get("sku")),
        barcode: optionalText(formData.get("barcode")),
        weightGrams: optionalText(formData.get("weightGrams")) ? z.coerce.number().int().min(0).parse(formData.get("weightGrams")) : null,
        priceRappen,
        compareAtPriceRappen,
        lowStockThreshold: z.coerce
          .number()
          .int()
          .min(0)
          .parse(formData.get("lowStockThreshold")),
        active: formData.get("active") === "on",
        trackInventory: formData.get("trackInventory") === "on",
      },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "VARIANT_UPDATED",
        entityType: "ProductVariant",
        entityId: id,
      },
    }),
  ]);
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function archiveRetailVariant(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  const productId = z.string().min(1).parse(formData.get("productId"));
  await prisma.$transaction([prisma.productVariant.update({ where: { id, productId }, data: { active: false, deletedAt: new Date() } }), prisma.auditLog.create({ data: { actorUserId: actor.id, action: "VARIANT_ARCHIVED", entityType: "ProductVariant", entityId: id } })]);
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function generateVariantMatrix(formData: FormData) {
  const actor = await requireRole("OWNER");
  const productId = z.string().min(1).parse(formData.get("productId"));
  const priceRappen = z.coerce.number().int().min(0).parse(formData.get("priceRappen"));
  const definitions = z.string().trim().min(1).max(4_000).parse(formData.get("options")).split(/\r?\n/).filter(Boolean).map((line) => {
    const [name, rawValues] = line.split(":", 2);
    const values = [...new Set((rawValues ?? "").split(",").map((value) => value.trim()).filter(Boolean))];
    return { name: name.trim(), values };
  });
  if (definitions.some(({ name, values }) => !name || !values.length)) throw new Error("OPTION_MATRIX_INVALID");
  if (new Set(definitions.map(({ name }) => name.toLocaleLowerCase())).size !== definitions.length) throw new Error("OPTION_NAMES_DUPLICATE");
  const combinations = definitions.reduce<Array<Array<{ name: string; value: string }>>>((rows, option) => rows.flatMap((row) => option.values.map((value) => [...row, { name: option.name, value }])), [[]]);
  if (combinations.length > 200) throw new Error("OPTION_MATRIX_TOO_LARGE");
  await prisma.$transaction(async (tx) => {
    const current = await tx.productVariant.findMany({ where: { productId, deletedAt: null }, include: { optionValues: { include: { optionValue: { include: { option: true } } } } } });
    const existing = new Set(current.map((variant) => variant.optionValues.map(({ optionValue }) => `${optionValue.option.name.toLocaleLowerCase()}=${optionValue.value.toLocaleLowerCase()}`).sort().join("|")));
    const optionRows: Array<{ option: { id: string; name: string }; values: Array<{ id: string; value: string }> }> = [];
    for (const [sortOrder, definition] of definitions.entries()) {
      const option = await tx.productOption.upsert({ where: { productId_name: { productId, name: definition.name } }, update: { sortOrder }, create: { productId, name: definition.name, sortOrder } });
      const values = [];
      for (const [valueOrder, value] of definition.values.entries()) values.push(await tx.productOptionValue.upsert({ where: { optionId_value: { optionId: option.id, value } }, update: { sortOrder: valueOrder }, create: { optionId: option.id, value, sortOrder: valueOrder } }));
      optionRows.push({ option, values });
    }
    let sortOrder = Math.max(-1, ...current.map((variant) => variant.sortOrder)) + 1;
    for (const combination of combinations) {
      const key = combination.map(({ name, value }) => `${name.toLocaleLowerCase()}=${value.toLocaleLowerCase()}`).sort().join("|");
      if (existing.has(key)) continue;
      const variant = await tx.productVariant.create({ data: { productId, nameEn: combination.map(({ value }) => value).join(" / "), nameDe: "", priceRappen, sortOrder: sortOrder++, lowStockThreshold: 5 } });
      const links = combination.map(({ name, value }) => ({ variantId: variant.id, optionValueId: optionRows.find(({ option }) => option.name === name)!.values.find((row) => row.value === value)!.id }));
      await tx.productVariantOptionValue.createMany({ data: links });
      existing.add(key);
    }
    await tx.auditLog.create({ data: { actorUserId: actor.id, action: "VARIANT_MATRIX_GENERATED", entityType: "Product", entityId: productId, metadata: { combinations: combinations.length } } });
  });
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function addRetailVariant(formData: FormData) {
  const actor = await requireRole("OWNER");
  const productId = z.string().min(1).parse(formData.get("productId"));
  const attributes = z
    .string()
    .trim()
    .max(2_000)
    .parse(formData.get("attributes"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [name, ...valueParts] = line.split(":");
      const value = valueParts.join(":").trim();
      return { name: name.trim(), value };
    });
  if (
    !attributes.length ||
    attributes.some(({ name, value }) => !name || !value)
  )
    throw new Error("Use one Name: Value attribute per line.");
  if (
    new Set(attributes.map(({ name }) => name.toLocaleLowerCase())).size !==
    attributes.length
  )
    throw new Error("Each option may appear only once per variant.");
  const sku = optionalText(formData.get("sku"));
  const priceRappen = z.coerce
    .number()
    .int()
    .min(0)
    .parse(formData.get("priceRappen"));
  const nameEn =
    optionalText(formData.get("nameEn")) ??
    attributes.map(({ value }) => value).join(" / ");
  await prisma.$transaction(async (tx) => {
    const current = await tx.productVariant.findMany({
      where: { productId, deletedAt: null },
      select: {
        sortOrder: true,
        optionValues: {
          select: {
            optionValue: {
              select: { value: true, option: { select: { name: true } } },
            },
          },
        },
      },
    });
    const key = attributes
      .map(
        ({ name, value }) =>
          `${name.toLocaleLowerCase()}=${value.toLocaleLowerCase()}`,
      )
      .sort()
      .join("|");
    if (
      current.some(
        (variant) =>
          variant.optionValues
            .map(
              ({ optionValue }) =>
                `${optionValue.option.name.toLocaleLowerCase()}=${optionValue.value.toLocaleLowerCase()}`,
            )
            .sort()
            .join("|") === key,
      )
    )
      throw new Error("VARIANT_COMBINATION_EXISTS");
    const variant = await tx.productVariant.create({
      data: {
        productId,
        nameEn,
        nameDe: "",
        sku,
        priceRappen,
        stockOnHand: 0,
        lowStockThreshold: 5,
        sortOrder:
          Math.max(-1, ...current.map(({ sortOrder }) => sortOrder)) + 1,
      },
    });
    for (const [sortOrder, attribute] of attributes.entries()) {
      const option = await tx.productOption.upsert({
        where: { productId_name: { productId, name: attribute.name } },
        update: {},
        create: { productId, name: attribute.name, sortOrder },
      });
      const value = await tx.productOptionValue.upsert({
        where: {
          optionId_value: { optionId: option.id, value: attribute.value },
        },
        update: {},
        create: { optionId: option.id, value: attribute.value },
      });
      await tx.productVariantOptionValue.create({
        data: { variantId: variant.id, optionValueId: value.id },
      });
    }
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "VARIANT_CREATED",
        entityType: "ProductVariant",
        entityId: variant.id,
      },
    });
  });
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function addRetailMedia(formData: FormData) {
  const actor = await requireRole("OWNER");
  const productId = z.string().min(1).parse(formData.get("productId"));
  const media = await prisma.productMedia.create({
    data: {
      productId,
      objectKey: z
        .string()
        .trim()
        .min(1)
        .max(2_048)
        .parse(formData.get("mediaKey")),
      variantId: optionalText(formData.get("variantId")),
      altEn: optionalText(formData.get("altEn")),
      altDe: optionalText(formData.get("altDe")),
      sortOrder: z.coerce
        .number()
        .int()
        .min(0)
        .parse(formData.get("sortOrder")),
    },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "PRODUCT_MEDIA_ADDED",
      entityType: "ProductMedia",
      entityId: media.id,
    },
  });
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function updateRetailMedia(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  const productId = z.string().min(1).parse(formData.get("productId"));
  const variantId = optionalText(formData.get("variantId"));
  if (variantId && !await prisma.productVariant.findFirst({ where: { id: variantId, productId }, select: { id: true } })) throw new Error("VARIANT_NOT_IN_PRODUCT");
  await prisma.$transaction(async (tx) => {
    const media = await tx.productMedia.update({ where: { id, productId }, data: { variantId, altEn: optionalText(formData.get("altEn")), altDe: optionalText(formData.get("altDe")), sortOrder: z.coerce.number().int().min(0).parse(formData.get("sortOrder")) } });
    if (formData.get("primary") === "on") await tx.product.update({ where: { id: productId }, data: { imageKey: media.objectKey } });
    await tx.auditLog.create({ data: { actorUserId: actor.id, action: "PRODUCT_MEDIA_UPDATED", entityType: "ProductMedia", entityId: id } });
  });
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function removeRetailMedia(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  const productId = z.string().min(1).parse(formData.get("productId"));
  await prisma.$transaction([
    prisma.productMedia.delete({ where: { id, productId } }),
    prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "PRODUCT_MEDIA_REMOVED",
        entityType: "ProductMedia",
        entityId: id,
      },
    }),
  ]);
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function adjustInventory(formData: FormData) {
  const actor = await requireRole("OWNER", "STAFF");
  const variantId = z.string().min(1).parse(formData.get("variantId"));
  const quantityChange = z.coerce
    .number()
    .int()
    .min(-100_000)
    .max(100_000)
    .refine((value) => value !== 0)
    .parse(formData.get("quantityChange"));
  const reason = z
    .string()
    .trim()
    .min(3)
    .max(500)
    .parse(formData.get("reason"));
  await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUniqueOrThrow({
      where: { id: variantId },
      select: { stockOnHand: true },
    });
    if (variant.stockOnHand + quantityChange < 0)
      throw new Error("INVENTORY_CANNOT_BE_NEGATIVE");
    await tx.productVariant.update({
      where: { id: variantId },
      data: { stockOnHand: { increment: quantityChange } },
    });
    await tx.inventoryMovement.create({
      data: {
        variantId,
        type: "MANUAL_ADJUSTMENT",
        quantityChange,
        reason,
        actorUserId: actor.id,
        idempotencyKey: `manual:${crypto.randomUUID()}`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "INVENTORY_ADJUSTED",
        entityType: "ProductVariant",
        entityId: variantId,
        metadata: { quantityChange, reason },
      },
    });
  });
  revalidatePath("/admin/inventory");
  redirect("/admin/inventory?saved=1");
}

export async function advanceRetailOrder(formData: FormData) {
  const actor = await requireRole("OWNER", "STAFF");
  const orderNumber = z.string().min(1).parse(formData.get("orderNumber"));
  const version = z.coerce.number().int().min(0).parse(formData.get("version"));
  await advanceOrder(orderNumber, version, actor.id);
  revalidatePath(`/admin/orders/${orderNumber}`);
  redirect(`/admin/orders/${orderNumber}?saved=1`);
}
