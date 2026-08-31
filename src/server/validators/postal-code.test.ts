import assert from "node:assert/strict";
import test from "node:test";

import { siteConfig } from "@/config/site";
import { createOrderSchema, deliveryQuoteSchema } from "@/server/validators/order";
import { postalCodeValueSchema } from "@/server/validators/postal-code";

test("postal codes preserve leading zeroes and normalize letters and spaces", () => {
  for (const [input, expected] of [
    ["8154", "8154"],
    ["01234", "01234"],
    ["sw1a   1aa", "SW1A 1AA"],
    [" k1a 0b1 ", "K1A 0B1"],
  ]) assert.equal(postalCodeValueSchema.parse(input), expected);

  for (const input of ["", "A/B", "-8154", "12345678901234567"])
    assert.equal(postalCodeValueSchema.safeParse(input).success, false);
});

test("order schemas compare normalized delivery and address postal codes", () => {
  assert.equal(deliveryQuoteSchema.parse({ postcode: " sw1a   1aa ", subtotalRappen: 1000 }).postcode, "SW1A 1AA");

  const order = createOrderSchema.safeParse({
    items: [{ variantId: "variant", quantity: 1 }],
    fulfillmentType: "DELIVERY",
    postcode: "sw1a   1aa",
    checkoutKey: crypto.randomUUID(),
    locale: siteConfig.locale,
    customerName: "Test Customer",
    customerEmail: "test@example.com",
    customerPhone: "123456",
    paymentMethod: "CASH_ON_DELIVERY",
    address: { recipientName: "Test Customer", phone: "123456", street: "Main Street 1", postalCode: " SW1A 1AA ", city: "London" },
  });

  assert.equal(order.success, true);
  if (order.success) assert.equal(order.data.address?.postalCode, "SW1A 1AA");
});
