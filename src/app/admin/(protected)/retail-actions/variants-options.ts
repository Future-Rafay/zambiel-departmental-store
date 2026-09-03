"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { optionalText } from "@/app/admin/(protected)/retail-actions/shared";
import { requireRole } from "@/server/auth/current-user";
import { prisma } from "@/server/db";
import { minorUnits } from "@/server/validators/admin";

export async function saveRetailVariant(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  const productId = z.string().min(1).parse(formData.get("productId"));
  const priceRappen = minorUnits.parse(formData.get("priceRappen"));
  const compareAt = optionalText(formData.get("compareAtPriceRappen"));
  const compareAtPriceRappen = compareAt ? minorUnits.pipe(z.number().gt(priceRappen)).parse(compareAt) : null;
  await prisma.$transaction([
    prisma.productVariant.update({ where: { id }, data: {
      nameEn: z.string().trim().min(1).max(160).parse(formData.get("nameEn")),
      nameDe: z.string().trim().max(160).parse(formData.get("nameDe")),
      sku: optionalText(formData.get("sku")), barcode: optionalText(formData.get("barcode")),
      weightGrams: optionalText(formData.get("weightGrams")) ? z.coerce.number().int().min(0).parse(formData.get("weightGrams")) : null,
      priceRappen, compareAtPriceRappen,
      lowStockThreshold: z.coerce.number().int().min(0).parse(formData.get("lowStockThreshold")),
      active: formData.get("active") === "on", trackInventory: formData.get("trackInventory") === "on",
    } }),
    prisma.auditLog.create({ data: { actorUserId: actor.id, action: "VARIANT_UPDATED", entityType: "ProductVariant", entityId: id } }),
  ]);
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?saved=1`);
}

export async function deleteRetailVariant(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  const productId = z.string().min(1).parse(formData.get("productId"));
  await prisma.$transaction([
    prisma.productVariant.update({ where: { id, productId }, data: { active: false, deletedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorUserId: actor.id, action: "VARIANT_DELETED", entityType: "ProductVariant", entityId: id } }),
  ]);
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?deleted=variant`);
}

export async function generateVariantMatrix(formData: FormData) {
  const actor = await requireRole("OWNER");
  const productId = z.string().min(1).parse(formData.get("productId"));
  const priceRappen = minorUnits.parse(formData.get("priceRappen"));
  const definitions = z.string().trim().min(1).max(4_000).parse(formData.get("options")).split(/\r?\n/).filter(Boolean).map((line) => {
    const [name, rawValues] = line.split(":", 2);
    return { name: name.trim(), values: [...new Set((rawValues ?? "").split(",").map((value) => value.trim()).filter(Boolean))] };
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
  const attributes = z.string().trim().max(2_000).parse(formData.get("attributes")).split(/\r?\n/).filter(Boolean).map((line) => {
    const [name, ...valueParts] = line.split(":");
    return { name: name.trim(), value: valueParts.join(":").trim() };
  });
  if (!attributes.length || attributes.some(({ name, value }) => !name || !value)) throw new Error("Use one Name: Value attribute per line.");
  if (new Set(attributes.map(({ name }) => name.toLocaleLowerCase())).size !== attributes.length) throw new Error("Each option may appear only once per variant.");
  const sku = optionalText(formData.get("sku"));
  const priceRappen = minorUnits.parse(formData.get("priceRappen"));
  const nameEn = optionalText(formData.get("nameEn")) ?? attributes.map(({ value }) => value).join(" / ");
  await prisma.$transaction(async (tx) => {
    const current = await tx.productVariant.findMany({ where: { productId, deletedAt: null }, select: { sortOrder: true, optionValues: { select: { optionValue: { select: { value: true, option: { select: { name: true } } } } } } } });
    const key = attributes.map(({ name, value }) => `${name.toLocaleLowerCase()}=${value.toLocaleLowerCase()}`).sort().join("|");
    if (current.some((variant) => variant.optionValues.map(({ optionValue }) => `${optionValue.option.name.toLocaleLowerCase()}=${optionValue.value.toLocaleLowerCase()}`).sort().join("|") === key)) throw new Error("VARIANT_COMBINATION_EXISTS");
    const variant = await tx.productVariant.create({ data: {
      productId, nameEn, nameDe: "", sku, priceRappen, stockOnHand: 0, lowStockThreshold: 5,
      sortOrder: Math.max(-1, ...current.map(({ sortOrder }) => sortOrder)) + 1,
    } });
    for (const [sortOrder, attribute] of attributes.entries()) {
      const option = await tx.productOption.upsert({ where: { productId_name: { productId, name: attribute.name } }, update: {}, create: { productId, name: attribute.name, sortOrder } });
      const value = await tx.productOptionValue.upsert({ where: { optionId_value: { optionId: option.id, value: attribute.value } }, update: {}, create: { optionId: option.id, value: attribute.value } });
      await tx.productVariantOptionValue.create({ data: { variantId: variant.id, optionValueId: value.id } });
    }
    await tx.auditLog.create({ data: { actorUserId: actor.id, action: "VARIANT_CREATED", entityType: "ProductVariant", entityId: variant.id } });
  });
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?saved=1`);
}
