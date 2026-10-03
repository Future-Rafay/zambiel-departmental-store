import assert from "node:assert/strict";
import test from "node:test";

test("retail quotes restrict variants to B2C products and categories", async () => {
  process.env.DATABASE_URL ??= "mysql://test:test@localhost:3306/zambiel_test";
  const { calculateQuote } = await import("@/server/services/order-quotes");
  let where: unknown;
  const db = {
    fulfillmentSettings: { findUniqueOrThrow: async () => ({ deliveryEnabled: true, pickupEnabled: true }) },
    productVariant: { findMany: async (input: { where: unknown }) => { where = input.where; return []; } },
  };

  await assert.rejects(
    calculateQuote({ items: [{ variantId: "variant", quantity: 1 }], fulfillmentType: "PICKUP" }, db as never),
    (error: unknown) => error instanceof Error && error.message === "PRODUCT_UNAVAILABLE",
  );
  assert.deepEqual(where, {
    id: { in: ["variant"] },
    active: true,
    deletedAt: null,
    product: { is_b2b: false, category: { is_b2b: false } },
  });
});

test("B2B quotes require approval and restrict variants to B2B products and categories", async () => {
  process.env.DATABASE_URL ??= "mysql://test:test@localhost:3306/zambiel_test";
  const { calculateQuote } = await import("@/server/services/order-quotes");
  let where: unknown;
  const approvedDb = {
    user: { findFirst: async () => ({ id: "user" }) },
    fulfillmentSettings: { findUniqueOrThrow: async () => ({ deliveryEnabled: true, pickupEnabled: true }) },
    productVariant: { findMany: async (input: { where: unknown }) => { where = input.where; return []; } },
  };

  await assert.rejects(
    calculateQuote({ items: [{ variantId: "variant", quantity: 1 }], fulfillmentType: "PICKUP", storeMode: "b2b" }, { ...approvedDb, user: { findFirst: async () => null } } as never, "user"),
    (error: unknown) => error instanceof Error && error.message === "B2B_ACCESS_REQUIRED",
  );
  await assert.rejects(
    calculateQuote({ items: [{ variantId: "variant", quantity: 1 }], fulfillmentType: "PICKUP", storeMode: "b2b" }, approvedDb as never, "user"),
    (error: unknown) => error instanceof Error && error.message === "PRODUCT_UNAVAILABLE",
  );
  assert.deepEqual(where, {
    id: { in: ["variant"] },
    active: true,
    deletedAt: null,
    product: { is_b2b: true, category: { is_b2b: true } },
  });
});
