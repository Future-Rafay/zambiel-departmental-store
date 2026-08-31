import { z } from "zod";

import { postalCodeValueSchema } from "@/server/validators/postal-code";

const cartItemSchema = z.object({
  variantId: z.string().min(1).max(191),
  quantity: z.number().int().min(1).max(20),
});

const fulfillmentFields = {
  fulfillmentType: z.enum(["DELIVERY", "PICKUP"]),
  postcode: postalCodeValueSchema.optional(),
};

export const deliveryQuoteSchema = z.object({
  postcode: postalCodeValueSchema,
  subtotalRappen: z.number().int().min(0).max(1_000_000),
});

const quoteSchemaBase = z.object({
  ...fulfillmentFields,
  items: z.array(cartItemSchema).min(1).max(100),
  promoCode: z.string().trim().max(64).optional(),
  customerEmail: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
});

function requireDeliveryPostcode(input: { fulfillmentType: "DELIVERY" | "PICKUP"; postcode?: string }, context: z.RefinementCtx) {
  if (input.fulfillmentType === "DELIVERY" && !input.postcode) {
    context.addIssue({ code: "custom", path: ["postcode"], message: "Postcode is required for delivery" });
  }
}

export const quoteSchema = quoteSchemaBase.superRefine(requireDeliveryPostcode);

const addressSchema = z.object({
  recipientName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(6).max(40),
  street: z.string().trim().min(3).max(200),
  streetExtra: z.string().trim().max(200).optional(),
  postalCode: postalCodeValueSchema,
  city: z.string().trim().min(2).max(120),
});

export const createOrderSchema = quoteSchemaBase.extend({
  checkoutKey: z.uuid(),
  locale: z.enum(["de", "en"]),
  customerName: z.string().trim().min(2).max(160),
  customerEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
  customerPhone: z.string().trim().min(6).max(40),
  paymentMethod: z.enum(["STRIPE", "CASH_ON_DELIVERY", "PAY_AT_PICKUP"]),
  note: z.string().trim().max(1000).optional(),
  address: addressSchema.optional(),
}).superRefine((input, context) => {
  requireDeliveryPostcode(input, context);
  if (input.fulfillmentType === "DELIVERY" && !input.address) {
    context.addIssue({ code: "custom", path: ["address"], message: "Address is required for delivery" });
  }
  if (input.fulfillmentType === "DELIVERY" && input.address && input.postcode !== input.address.postalCode) {
    context.addIssue({ code: "custom", path: ["address", "postalCode"], message: "Address postcode must match delivery postcode" });
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
