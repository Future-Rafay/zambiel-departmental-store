import assert from "node:assert/strict";
import test from "node:test";
import {
  addCartLines,
  addRecentlyViewed,
  orderNumberFromLink,
  paymentForFulfillment,
  priceFilter,
  readCart,
  readRecentlyViewed,
  selectedVariant,
} from "./commerce";
import type { CartLine, Product } from "./types";

test("cart merges variants and respects authoritative quantity and line limits", () => {
  const line: CartLine = {
    variantId: "v1",
    productId: "p1",
    slug: "product",
    name: "Product",
    variant: "Default",
    priceRappen: 1295,
    imageUrl: null,
    quantity: 15,
  };
  assert.equal(
    addCartLines([line], [{ ...line, quantity: 12 }])[0].quantity,
    20,
  );
  assert.equal(line.quantity, 15);
  assert.equal(
    readCart([{ ...line, quantity: -1 }, { ...line, priceRappen: NaN }, line])
      .length,
    1,
  );
  assert.equal(
    addCartLines(
      [],
      Array.from({ length: 105 }, (_, i) => ({ ...line, variantId: `v${i}` })),
    ).length,
    100,
  );
});
test("price filters retain blank versus zero and reject invalid money", () => {
  assert.equal(priceFilter(""), undefined);
  assert.equal(priceFilter("0"), 0);
  assert.equal(priceFilter("12,95"), 1295);
  assert.throws(() => priceFilter("1e4"));
  assert.throws(() => priceFilter("1.234"));
});
test("deep links only select an order and never accept external navigation", () => {
  assert.equal(orderNumberFromLink("zambiel://orders/ZAM-123"), "ZAM-123");
  assert.equal(orderNumberFromLink("https://evil.test/orders/ZAM-123"), null);
  assert.equal(orderNumberFromLink("zambiel://orders/../../admin"), null);
});
test("variant selection uses arbitrary option IDs, never size/color assumptions", () => {
  const product = {
    options: [{ id: "power" }, { id: "plug" }],
    variants: [
      {
        id: "v1",
        optionValues: [
          { optionId: "power", valueId: "220" },
          { optionId: "plug", valueId: "ch" },
        ],
      },
    ],
  } as unknown as Product;
  assert.equal(
    selectedVariant(product, { power: "220", plug: "ch" })?.id,
    "v1",
  );
  assert.equal(selectedVariant(product, { power: "220" }), undefined);
});
test("recently viewed products are deduplicated, newest first, and bounded", () => {
  const products = Array.from({ length: 9 }, (_, id) => ({
    id: String(id),
    slug: `p-${id}`,
    name: `Product ${id}`,
    imageUrl: null,
    minimumPriceRappen: id * 100,
  }));
  const recent = products.reduce(addRecentlyViewed, []);
  assert.deepEqual(
    recent.map((product) => product.id),
    ["8", "7", "6", "5", "4", "3", "2", "1"],
  );
  assert.equal(addRecentlyViewed(recent, products[5])[0].id, "5");
  assert.deepEqual(readRecentlyViewed({ broken: true }), []);
});
test("cash payment follows the selected fulfillment type", () => {
  assert.equal(
    paymentForFulfillment("CASH_ON_DELIVERY", "PICKUP"),
    "PAY_AT_PICKUP",
  );
  assert.equal(
    paymentForFulfillment("PAY_AT_PICKUP", "DELIVERY"),
    "CASH_ON_DELIVERY",
  );
  assert.equal(paymentForFulfillment("STRIPE", "PICKUP"), "STRIPE");
});
