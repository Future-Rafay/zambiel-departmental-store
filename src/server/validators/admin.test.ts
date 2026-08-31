import assert from "node:assert/strict";
import test from "node:test";

import { postalCodeSchema, promoSchema, refundSchema } from "@/server/validators/admin";

test("admin trust boundaries reject unsafe promo and refund input", () => {
  assert.equal(promoSchema.safeParse({ code: "TOO-MUCH", type: "PERCENT", value: "100.01", minimumSubtotalRappen: "0", startsAt: "", endsAt: "", totalUsageLimit: "", perCustomerLimit: "", active: "on" }).success, false);
  assert.equal(refundSchema.safeParse({ orderNumber: "SNP-000123", amountRappen: "0", reason: "requested", refundKey: crypto.randomUUID(), cancelOrder: "false" }).success, false);
});

test("admin form decoding accepts omitted checkboxes and fixture IDs", () => {
  assert.equal(promoSchema.parse({ code: "SAVE10", type: "PERCENT", value: "10", minimumSubtotalRappen: "25.00", startsAt: "", endsAt: "", totalUsageLimit: "", perCustomerLimit: "" }).value, 1000);
  const postalCode = postalCodeSchema.parse({ deliveryZoneId: "mock-zone-1", postalCode: " sw1a   1aa " });
  assert.equal(postalCode.deliveryZoneId, "mock-zone-1");
  assert.equal(postalCode.postalCode, "SW1A 1AA");
});
