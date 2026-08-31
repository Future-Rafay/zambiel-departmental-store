"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/current-user";
import { postalCodeValueSchema } from "@/server/validators/postal-code";

const profileSchema = z.object({ locale: z.enum(["de", "en"]), name: z.string().trim().min(2).max(160), phone: z.string().trim().min(6).max(40), street: z.string().trim().min(3).max(200), streetExtra: z.string().trim().max(200).optional(), postalCode: postalCodeValueSchema, city: z.string().trim().min(2).max(120) });
export async function saveCustomerProfile(formData: FormData) {
  const user = await requireRole("CUSTOMER", "OWNER");
  const input = profileSchema.parse(Object.fromEntries(formData));
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { name: input.name, phone: input.phone } });
    await tx.customerAddress.upsert({ where: { userId: user.id }, update: { label: "Delivery", recipientName: input.name, phone: input.phone, street: input.street, streetExtra: input.streetExtra || null, postalCode: input.postalCode, city: input.city, countryCode: "CH", isDefault: true }, create: { userId: user.id, label: "Delivery", recipientName: input.name, phone: input.phone, street: input.street, streetExtra: input.streetExtra || null, postalCode: input.postalCode, city: input.city, countryCode: "CH", isDefault: true } });
  });
  revalidatePath(`/${input.locale}/account`); redirect(`/${input.locale}/account?saved=1`);
}
