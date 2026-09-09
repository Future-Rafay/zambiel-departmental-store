import { z } from "zod";
import { countryCodeSchema } from "@/server/validators/country-code";

export const mobileProfileSchema = z.object({ name: z.string().trim().min(2).max(160), phone: z.string().trim().min(6).max(40).nullable().optional() });
export const mobileAddressSchema = z.object({ label: z.string().trim().min(1).max(80), recipientName: z.string().trim().min(2).max(160), phone: z.string().trim().min(6).max(40), street: z.string().trim().min(3).max(200), streetExtra: z.string().trim().max(200).nullable().optional(), city: z.string().trim().min(2).max(120), countryCode: countryCodeSchema, isDefault: z.boolean().optional() });
export const deletionRequestSchema = z.object({ reason: z.string().trim().max(1000).nullable().optional() });
