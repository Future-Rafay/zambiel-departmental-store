import { z } from "zod";

import { countryCodeSchema } from "@/server/validators/country-code";

const cartItemSchema = z.object({
  variantId: z.string().min(1).max(191),
  quantity: z.number().int().min(1).max(20),
});

const fulfillmentFields = {
  fulfillmentType: z.enum(["DELIVERY", "PICKUP"]),
  countryCode: countryCodeSchema.optional(),
};

export const deliveryQuoteSchema = z.object({
  countryCode: countryCodeSchema,
  subtotalRappen: z.number().int().min(0).max(1_000_000),
});

const quoteSchemaBase = z.object({
  ...fulfillmentFields,
  items: z.array(cartItemSchema).min(1).max(100),
  promoCode: z.string().trim().max(64).optional(),
  customerEmail: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
});

function requireDeliveryCountry(input: { fulfillmentType: "DELIVERY" | "PICKUP"; countryCode?: string }, context: z.RefinementCtx) {
  if (input.fulfillmentType === "DELIVERY" && !input.countryCode) {
    context.addIssue({ code: "custom", path: ["countryCode"], message: "Country is required for delivery" });
  }
}

export const quoteSchema = quoteSchemaBase.superRefine(requireDeliveryCountry);

const addressSchema = z.object({
  recipientName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(6).max(40),
  street: z.string().trim().min(3).max(200),
  streetExtra: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(120),
});

export const createOrderSchema = quoteSchemaBase.extend({
  checkoutKey: z.uuid(),
  channel: z.enum(["web", "mobile"]).optional(),
  locale: z.enum(["de", "en"]),
  customerName: z.string().trim().min(2).max(160),
  customerEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
  customerPhone: z.string().trim().min(6).max(40),
  paymentMethod: z.enum(["STRIPE", "CASH_ON_DELIVERY", "PAY_AT_PICKUP"]),
  note: z.string().trim().max(1000).optional(),
  address: addressSchema.optional(),
}).superRefine((input, context) => {
  requireDeliveryCountry(input, context);
  if (input.fulfillmentType === "DELIVERY" && !input.address) {
    context.addIssue({ code: "custom", path: ["address"], message: "Address is required for delivery" });
  }
  if (input.fulfillmentType === "DELIVERY" && input.address && input.countryCode !== input.address.countryCode) {
    context.addIssue({ code: "custom", path: ["address", "countryCode"], message: "Address country must match shipping country" });
  }
  if (
    (input.fulfillmentType === "DELIVERY" && input.paymentMethod === "PAY_AT_PICKUP")
    || (input.fulfillmentType === "PICKUP" && input.paymentMethod === "CASH_ON_DELIVERY")
  ) {
    context.addIssue({ code: "custom", path: ["paymentMethod"], message: "Payment method is not valid for this fulfillment type" });
  }
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
