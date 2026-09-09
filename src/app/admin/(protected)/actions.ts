"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";

import { requireRole } from "@/server/auth/current-user";
import {
  AdminError,
  cancelOrder,
  refundOrder,
  savePromo,
  saveSiteSettings,
  saveZone,
  setStaffActive,
} from "@/server/services/admin";
import { inviteStaff } from "@/server/services/staff-invitations";
import {
  cancelOrderSchema,
  promoSchema,
  refundSchema,
  siteSettingsSchema,
  zoneSchema,
} from "@/server/validators/admin";
import { inviteStaffSchema } from "@/server/validators/staff-invitation";

const idSchema = z.string().trim().min(1).max(191);

function values(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()].filter(([, value]) => typeof value === "string"),
  );
}

function safeReturnTo(formData: FormData) {
  const value = formData.get("returnTo");
  return typeof value === "string" &&
    value.startsWith("/admin") &&
    !value.startsWith("//")
    ? value
    : "/admin";
}

function errorCode(error: unknown) {
  if (error instanceof AdminError) return error.code;
  if (error instanceof ZodError)
    return error.issues[0]?.message || "INVALID_INPUT";
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "ALREADY_EXISTS";
    if (error.code === "P2025") return "NOT_FOUND";
    if (error.code === "P2003") return "IN_USE";
  }
  if (
    error instanceof Error &&
    ["OWNER_CANNOT_BE_INVITED_AS_STAFF", "FORBIDDEN"].includes(error.message)
  )
    return error.message;
  return "ACTION_FAILED";
}

export async function adminAction(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  let warning = "";
  try {
    const input = values(formData);
    const intent = z.string().min(1).parse(input.intent);
    const ownerOnly = !["cancel_order", "refund"].includes(intent);
    const actor = await requireRole(
      ...(ownerOnly
        ? ["OWNER" as const]
        : ["OWNER" as const, "STAFF" as const]),
    );
    switch (intent) {
      case "zone":
        await saveZone(actor.id, zoneSchema.parse(input));
        break;
      case "site_settings":
        await saveSiteSettings(actor.id, siteSettingsSchema.parse(input));
        break;
      case "promo":
        await savePromo(actor.id, promoSchema.parse(input));
        break;
      case "invite_staff": {
        const result = await inviteStaff(
          actor.id,
          inviteStaffSchema.parse(input),
        );
        if (!result.emailSent) warning = "INVITATION_SAVED_EMAIL_FAILED";
        break;
      }
      case "staff_active":
        await setStaffActive(
          actor.id,
          idSchema.parse(input.id),
          input.active === "true",
        );
        break;
      case "cancel_order": {
        const parsed = cancelOrderSchema.parse(input);
        await cancelOrder(actor.id, parsed.orderNumber, parsed.reason);
        break;
      }
      case "refund":
        await refundOrder(actor.id, refundSchema.parse(input));
        break;
      default:
        throw new AdminError("UNKNOWN_ACTION");
    }
    revalidatePath("/admin", "layout");
  } catch (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(errorCode(error))}`);
  }
  redirect(`${returnTo}?saved=1${warning ? `&warning=${warning}` : ""}`);
}
