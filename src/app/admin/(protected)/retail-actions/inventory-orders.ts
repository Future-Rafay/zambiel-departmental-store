"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/server/auth/current-user";
import { prisma } from "@/server/db";
import { advanceOrder } from "@/server/services/ordering";

export async function adjustInventory(formData: FormData) {
  const actor = await requireRole("OWNER", "STAFF");
  const variantId = z.string().min(1).parse(formData.get("variantId"));
  const quantityChange = z.coerce.number().int().min(-100_000).max(100_000).refine((value) => value !== 0).parse(formData.get("quantityChange"));
  const reason = z.string().trim().min(3).max(500).parse(formData.get("reason"));
  // One key per rendered form: a double submit hits the unique ledger key instead of adjusting twice.
  const adjustmentKey = z.uuid().parse(formData.get("adjustmentKey"));
  try {
    await prisma.$transaction(async (tx) => {
      await tx.inventoryMovement.create({ data: { variantId, type: "MANUAL_ADJUSTMENT", quantityChange, reason, actorUserId: actor.id, idempotencyKey: `manual:${adjustmentKey}` } });
      // Open Stripe checkouts hold stockReserved; going below it would make their payment finalization fail.
      const changed = await tx.$executeRaw`UPDATE productvariant SET stockOnHand = stockOnHand + ${quantityChange}, updatedAt = NOW(3) WHERE id = ${variantId} AND (${quantityChange} > 0 OR stockOnHand + ${quantityChange} >= stockReserved)`;
      if (changed !== 1) throw new Error("INVENTORY_BELOW_RESERVED");
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: "INVENTORY_ADJUSTED", entityType: "ProductVariant", entityId: variantId, metadata: { quantityChange, reason } } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVENTORY_BELOW_RESERVED") redirect("/admin/inventory?error=INVENTORY_BELOW_RESERVED");
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
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
