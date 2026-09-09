import assert from "node:assert/strict";
import test from "node:test";

import { cancelOrderSchema, minorUnits, promoSchema, refundSchema, zoneSchema } from "@/server/validators/admin";

test("admin trust boundaries reject unsafe promo and refund input", () => {
  assert.equal(promoSchema.safeParse({ code: "TOO-MUCH", type: "PERCENT", value: "100.01", minimumSubtotalRappen: "0", startsAt: "", endsAt: "", totalUsageLimit: "", perCustomerLimit: "", active: "on" }).success, false);
  assert.equal(refundSchema.safeParse({ orderNumber: "SNP-000123", amountRappen: "0", reason: "requested", refundKey: crypto.randomUUID(), cancelOrder: "false" }).success, false);
});

test("admin form decoding accepts omitted checkboxes and fixture IDs", () => {
  assert.equal(promoSchema.parse({ code: "SAVE10", type: "PERCENT", value: "10", minimumSubtotalRappen: "25.00", startsAt: "", endsAt: "", totalUsageLimit: "", perCustomerLimit: "" }).value, 1000);
  const country = zoneSchema.parse({ countryCode: " pk ", nameDe: "Pakistan", nameEn: "Pakistan", feeRappen: "15", minimumSubtotalRappen: "0", freeDeliveryThresholdRappen: "120", sortOrder: "0" });
  assert.equal(country.countryCode, "PK");
  assert.equal(country.minimumSubtotalRappen, 0);
});

test("admin money and order identifiers use CHF decimals and current or legacy prefixes", () => {
  assert.equal(minorUnits.parse("49.65"), 4965);
  assert.equal(cancelOrderSchema.safeParse({ orderNumber: "ZAM-000123", reason: "Customer request" }).success, true);
  assert.equal(cancelOrderSchema.safeParse({ orderNumber: "SNP-000123", reason: "Legacy order" }).success, true);
  assert.equal(cancelOrderSchema.safeParse({ orderNumber: "BAD-000123", reason: "Invalid order" }).success, false);
});
