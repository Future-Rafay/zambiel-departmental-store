"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/server/auth/current-user";
import { AdminError, adjustVariantStock } from "@/server/services/admin";
import { advanceOrder } from "@/server/services/ordering";

export async function adjustInventory(formData: FormData) {
  const actor = await requireRole("OWNER", "STAFF");
  const variantId = z.string().min(1).parse(formData.get("variantId"));
  const quantityChange = z.coerce.number().int().min(-100_000).max(100_000).refine((value) => value !== 0).parse(formData.get("quantityChange"));
  const reason = z.string().trim().min(3).max(500).parse(formData.get("reason"));
  const adjustmentKey = z.uuid().parse(formData.get("adjustmentKey"));
  try {
    await adjustVariantStock(actor.id, { variantId, quantityChange, reason, adjustmentKey });
  } catch (error) {
    if (error instanceof AdminError && error.code === "INVENTORY_BELOW_RESERVED") redirect("/admin/inventory?error=INVENTORY_BELOW_RESERVED");
    throw error;
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
