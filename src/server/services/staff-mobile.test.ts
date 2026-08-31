import assert from "node:assert/strict";
import { test } from "node:test";

import { allowedOrderActions } from "@/server/services/staff-mobile-actions";
import { staffOrderFilterSchema } from "@/server/validators/staff-mobile";

test("staff allowed actions keep refund-required Stripe orders out of routine cancellation", () => {
  assert.deepEqual(
    allowedOrderActions({
      status: "CONFIRMED",
      fulfillmentType: "DELIVERY",
      payment: { provider: "STRIPE", status: "PAID" },
    }),
    { nextStatus: "PROCESSING", canConfirmCash: false, canCancel: false, canRefundAndCancel: true },
  );
});

test("staff allowed actions expose routine cash confirmation and cancellation", () => {
  assert.deepEqual(
    allowedOrderActions({
      status: "CONFIRMED",
      fulfillmentType: "PICKUP",
      payment: { provider: "CASH", status: "PENDING" },
    }),
    { nextStatus: "PROCESSING", canConfirmCash: true, canCancel: true, canRefundAndCancel: false },
  );
});


test("staff order status filter accepts known values and rejects unknown input", () => {
  assert.equal(staffOrderFilterSchema.parse(undefined), undefined);
  assert.equal(staffOrderFilterSchema.parse("PROCESSING"), "PROCESSING");
  assert.throws(() => staffOrderFilterSchema.parse("NOT_A_STATUS"));
});

test("staff order DTO exposes presentation data without internal identifiers or payment secrets", async () => {
  process.env.DATABASE_URL = "mysql://test:test@127.0.0.1:3306/zambiel_test";
  process.env.AWS_REGION = "eu-central-1";
  process.env.AWS_ACCESS_KEY_ID = "test";
  process.env.AWS_SECRET_ACCESS_KEY = "test";
  process.env.S3_BUCKET_NAME = "test";
  process.env.S3_PUBLIC_BASE_URL = "https://media.example.com";
  const { staffOrderDto } = await import("@/server/services/staff-mobile");
  const now = new Date("2026-08-12T12:00:00.000Z");
  const dto = staffOrderDto({
    id: 42n,
    locale: "DE",
    status: "CONFIRMED",
    version: 1,
    customerName: "Guest",
    customerEmail: "guest@example.com",
    customerPhone: "+41000000000",
    fulfillmentType: "DELIVERY",
    paymentMethod: "STRIPE",
    note: "Ring bell",
    subtotalRappen: 3000,
    discountRappen: 0,
    deliveryFeeRappen: 500,
    taxRateBps: null,
    taxAmountRappen: 0,
    totalRappen: 3500,
    deliveryZoneNameDeSnapshot: "Oberglatt",
    deliveryZoneNameEnSnapshot: "Oberglatt",
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
    address: null,
    payment: { provider: "STRIPE", status: "PAID", amountRappen: 3500, refundedRappen: 500, paidAt: now },
    items: [{
      productNameDeSnapshot: "Burger",
      productNameEnSnapshot: "Burger",
      variantNameDeSnapshot: null,
      variantNameEnSnapshot: null,
      unitPriceRappen: 1500,
      quantity: 2,
      lineSubtotalRappen: 3000,
      product: { imageKey: "Zambiel/products/item.webp" },
      options: [{ nameDeSnapshot: "Scharf", nameEnSnapshot: "Spicy", priceDeltaRappen: 0 }],
    }],
    statusEvents: [{ fromStatus: "PAYMENT_PENDING", toStatus: "CONFIRMED", reason: null, note: null, createdAt: now, actor: { name: "Owner" } }],
    checkoutKeyHash: "must-not-leak",
    guestTrackingTokenHash: "must-not-leak",
    stripePaymentIntentId: "must-not-leak",
  } as never);

  assert.equal(dto.orderNumber, "ZAM-000042");
  assert.equal(dto.items[0]?.imageUrl, "https://media.example.com/Zambiel/products/item.webp");
  assert.equal(dto.remainingRefundableRappen, 3000);
  assert.equal(dto.statusEvents[0]?.actorName, "Owner");
  assert.equal("id" in dto, false);
  assert.equal("checkoutKeyHash" in dto, false);
  assert.equal("guestTrackingTokenHash" in dto, false);
  assert.equal("stripePaymentIntentId" in dto, false);
  assert.doesNotThrow(() => JSON.stringify(dto));
});
