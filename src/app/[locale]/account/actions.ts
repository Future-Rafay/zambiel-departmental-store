"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/auth/current-user";
import { countryCodeSchema } from "@/server/validators/country-code";

const profileSchema = z.object({ locale: z.enum(["de", "en"]), name: z.string().trim().min(2).max(160), phone: z.string().trim().min(6).max(40), street: z.string().trim().min(3).max(200), streetExtra: z.string().trim().max(200).optional(), city: z.string().trim().min(2).max(120), countryCode: countryCodeSchema });
export async function saveCustomerProfile(formData: FormData) {
  const user = await requireRole("CUSTOMER", "OWNER");
  const input = profileSchema.parse(Object.fromEntries(formData));
  const country = await prisma.deliveryZone.findUnique({ where: { countryCode: input.countryCode }, select: { active: true } });
  if (!country?.active) redirect(`/${input.locale}/account?error=COUNTRY_NOT_DELIVERABLE`);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { name: input.name, phone: input.phone } });
    const address = await tx.customerAddress.findFirst({ where: { userId: user.id, isDefault: true }, select: { id: true } });
    const data = { label: "Delivery", recipientName: input.name, phone: input.phone, street: input.street, streetExtra: input.streetExtra || null, postalCode: null, city: input.city, countryCode: input.countryCode, isDefault: true };
    if (address) await tx.customerAddress.update({ where: { id: address.id }, data });
    else await tx.customerAddress.create({ data: { ...data, userId: user.id } });
  });
  revalidatePath(`/${input.locale}/account`); redirect(`/${input.locale}/account?saved=1`);
}
