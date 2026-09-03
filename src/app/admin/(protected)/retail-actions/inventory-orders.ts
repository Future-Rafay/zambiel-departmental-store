"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/server/auth/current-user";
import { prisma } from "@/server/db";
import { advanceOrder } from "@/server/services/ordering";

export async function adjustInventory(formData: FormData) {
  const actor = await requireRole("OWNER", "STAFF");
  const variantId = z.string().min(1).parse(formData.get("variantId"));
  const quantityChange = z.coerce.number().int().min(-100_000).max(100_000).refine((value) => value !== 0).parse(formData.get("quantityChange"));
  const reason = z.string().trim().min(3).max(500).parse(formData.get("reason"));
  await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { stockOnHand: true } });
    if (variant.stockOnHand + quantityChange < 0) throw new Error("INVENTORY_CANNOT_BE_NEGATIVE");
    await tx.productVariant.update({ where: { id: variantId }, data: { stockOnHand: { increment: quantityChange } } });
    await tx.inventoryMovement.create({ data: { variantId, type: "MANUAL_ADJUSTMENT", quantityChange, reason, actorUserId: actor.id, idempotencyKey: `manual:${crypto.randomUUID()}` } });
    await tx.auditLog.create({ data: { actorUserId: actor.id, action: "INVENTORY_ADJUSTED", entityType: "ProductVariant", entityId: variantId, metadata: { quantityChange, reason } } });
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
