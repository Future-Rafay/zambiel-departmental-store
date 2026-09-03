"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { optionalText } from "@/app/admin/(protected)/retail-actions/shared";
import { requireRole } from "@/server/auth/current-user";
import { prisma } from "@/server/db";

export async function addRetailMedia(formData: FormData) {
  const actor = await requireRole("OWNER");
  const productId = z.string().min(1).parse(formData.get("productId"));
  const media = await prisma.productMedia.create({ data: {
    productId,
    objectKey: z.string().trim().min(1).max(2_048).parse(formData.get("mediaKey")),
    variantId: optionalText(formData.get("variantId")),
    altEn: optionalText(formData.get("altEn")),
    altDe: optionalText(formData.get("altDe")),
    sortOrder: z.coerce.number().int().min(0).parse(formData.get("sortOrder")),
  } });
  await prisma.auditLog.create({ data: { actorUserId: actor.id, action: "PRODUCT_MEDIA_ADDED", entityType: "ProductMedia", entityId: media.id } });
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
    prisma.auditLog.create({ data: { actorUserId: actor.id, action: "PRODUCT_MEDIA_REMOVED", entityType: "ProductMedia", entityId: id } }),
  ]);
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?saved=1`);
}
