import assert from "node:assert/strict";
import test from "node:test";

import { siteConfig } from "@/config/site";
import { allocateDiscount, formatMoney, formatOrderNumber, nextOrderStatus, orderStatusLabel, promoDiscount, publicOrderAddress, shippingFeeRappen } from "@/lib/orders";
import { zurichDateToUtc } from "@/lib/zurich-time";

test("order money and lifecycle rules stay server-shaped", () => {
  assert.equal(formatOrderNumber(42), "ZAM-000042");
  assert.equal(formatMoney(1_250, "en"), new Intl.NumberFormat("en-CH", { style: "currency", currency: siteConfig.currency }).format(12.5));
  assert.equal(promoDiscount(5_000, { type: "PERCENT", value: 1_000, minimumSubtotalRappen: 2_500 }), 500);
  assert.equal(promoDiscount(300, { type: "FIXED", value: 500, minimumSubtotalRappen: 0 }), 300);
  assert.equal(nextOrderStatus("PROCESSING", "PICKUP"), "READY_FOR_PICKUP");
  assert.equal(nextOrderStatus("PROCESSING", "DELIVERY"), "OUT_FOR_DELIVERY");
  assert.equal(orderStatusLabel("OUT_FOR_DELIVERY", "en"), "Out for delivery");
  assert.equal(orderStatusLabel("OUT_FOR_DELIVERY", "de"), "Unterwegs");
  assert.equal(nextOrderStatus("DELIVERED", "DELIVERY"), null);
  assert.deepEqual(allocateDiscount([850, 1_200], 1_000), [0, 1_050]);
});

test("public order addresses never expose the BigInt order id", () => {
  const address = publicOrderAddress({ recipientName: "Guest", phone: "+41", street: "Main 1", streetExtra: null, postalCode: "8304", city: "Wallisellen", countryCode: "CH", orderId: 42n } as Parameters<typeof publicOrderAddress>[0] & { orderId: bigint });
  assert.equal(JSON.stringify(address).includes("orderId"), false);
  assert.doesNotThrow(() => JSON.stringify(address));
});

test("applies a country shipping fee below its free-shipping threshold", () => {
  assert.equal(shippingFeeRappen(11_999, 1_500, 12_000), 1_500);
  assert.equal(shippingFeeRappen(12_000, 1_500, 12_000), 0);
  assert.equal(shippingFeeRappen(50_000, 1_500, null), 1_500);
});

test("Zurich local timestamps convert correctly across daylight saving time", () => {
  const winter = zurichDateToUtc("2026-01-15", 12 * 60);
  const summer = zurichDateToUtc("2026-07-15", 12 * 60);
  assert.equal(winter.toISOString(), "2026-01-15T11:00:00.000Z");
  assert.equal(summer.toISOString(), "2026-07-15T10:00:00.000Z");
});
