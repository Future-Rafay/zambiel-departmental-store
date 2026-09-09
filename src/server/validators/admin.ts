import { z } from "zod";

import { siteConfig } from "@/config/site";
import { parseOrderNumber } from "@/lib/orders";
import { zurichDateToUtc } from "@/lib/zurich-time";
import { countryCodeSchema } from "@/server/validators/country-code";
import { postalCodeValueSchema } from "@/server/validators/postal-code";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);
const integer = (minimum = 0) => z.coerce.number().int().min(minimum);
const optionalInteger = (minimum = 0) => z.union([z.literal(""), z.coerce.number().int().min(minimum)]).transform((value) => value === "" ? null : value);
const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());
const databaseId = z.string().trim().min(1).max(191);
export const minorUnits = z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, `Enter a valid ${siteConfig.currency} amount.`).transform((value) => {
  const [units, decimals = ""] = value.split(".");
  return Number(units) * 100 + Number(decimals.padEnd(2, "0"));
});
const optionalMinorUnits = z.union([z.literal(""), minorUnits]).transform((value) => value === "" ? null : value);
const orderNumber = z.string().trim().refine((value) => parseOrderNumber(value) !== null, "Enter a valid order number.");
const percentBasisPoints = z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, "Enter a valid percentage.").transform((value) => Math.round(Number(value) * 100));
const optionalZurichDateTime = z.union([
  z.literal(""),
  z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).transform((value) => {
    const [date, time] = value.split("T");
    const [hour, minute] = time.split(":").map(Number);
    return zurichDateToUtc(date, hour * 60 + minute);
  }),
]).transform((value) => value === "" ? null : value);
export const zoneSchema = z.object({
  id: databaseId.optional(),
  countryCode: countryCodeSchema,
  nameDe: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  active: checkbox,
  feeRappen: minorUnits,
  minimumSubtotalRappen: minorUnits,
  freeDeliveryThresholdRappen: optionalMinorUnits,
  estimatedMinutes: integer(1).max(100_800).default(1440),
  sortOrder: integer(),
});

export const siteSettingsSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  legalName: optionalText(160),
  email: z.union([z.literal(""), z.string().trim().email().max(320)]).transform((value) => value || null),
  phone: optionalText(40),
  street: optionalText(200),
  postalCode: z.union([z.literal(""), postalCodeValueSchema]).transform((value) => value || null),
  city: optionalText(120),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  logoKey: optionalText(512),
  compactLogoKey: optionalText(512),
  faviconKey: optionalText(512),
  heroImageKey: optionalText(512),
  heroTitleDe: optionalText(240),
  heroTitleEn: optionalText(240),
  heroSubtitleDe: optionalText(5000),
  heroSubtitleEn: optionalText(5000),
  aboutDe: optionalText(10000),
  aboutEn: optionalText(10000),
  announcementDe: optionalText(500),
  announcementEn: optionalText(500),
  announcementActive: checkbox,
  instagramUrl: z.union([z.literal(""), z.string().trim().url().max(512)]).transform((value) => value || null),
  facebookUrl: z.union([z.literal(""), z.string().trim().url().max(512)]).transform((value) => value || null),
});

export const promoSchema = z.object({
  id: databaseId.optional(),
  code: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  type: z.enum(["FIXED", "PERCENT"]),
  value: z.string().trim(),
  minimumSubtotalRappen: minorUnits,
  startsAt: optionalZurichDateTime,
  endsAt: optionalZurichDateTime,
  totalUsageLimit: optionalInteger(1),
  perCustomerLimit: optionalInteger(1),
  active: checkbox,
}).transform((value) => ({
  ...value,
  value: value.type === "PERCENT" ? percentBasisPoints.parse(value.value) : minorUnits.parse(value.value),
})).refine((value) => value.type !== "PERCENT" || value.value <= 10000, { message: "Percentage cannot exceed 100%." })
  .refine((value) => !value.startsAt || !value.endsAt || value.startsAt < value.endsAt, { message: "End must be after start." });

export const refundSchema = z.object({
  orderNumber,
  amountRappen: minorUnits.pipe(z.number().min(1)),
  reason: z.string().trim().min(3).max(500),
  refundKey: z.string().uuid(),
  cancelOrder: checkbox,
});

export const refundAndCancelSchema = z.object({
  orderNumber,
  reason: z.string().trim().min(3).max(500),
  refundKey: z.string().trim().min(8).max(255),
});

export const cancelOrderSchema = z.object({
  orderNumber,
  reason: z.string().trim().min(3).max(500),
});
