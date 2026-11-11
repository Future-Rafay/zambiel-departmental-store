import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";

import { hashToken } from "@/lib/orders";

test("createOrder counts a promo only when it discounts, refuses card totals Stripe cannot charge, and replays a checkout key", async (context) => {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl || testDatabaseUrl === process.env.DATABASE_URL) {
    context.skip("TEST_DATABASE_URL must point to a separate isolated database.");
    return;
  }
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DATABASE_CONNECTION_LIMIT = "1";
  process.env.DATABASE_SSL ??= "false";
  // Order notifications must not reach Resend from tests; a delivery failure is logged and recorded.
  delete process.env.CONTACT_EMAIL_TO_DEV;
  process.env.RESEND_API_KEY = "re_placeholder";
  // The card order below is refused before any Stripe call; the keys only need to parse.
  process.env.STRIPE_SECRET_KEY ??= "sk_test_placeholder";
  process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_placeholder";
  process.env.APP_URL ??= "http://localhost:3000";

  const [{ prisma }, { createOrder }] = await Promise.all([import("@/server/db"), import("@/server/services/ordering")]);
  const suffix = crypto.randomUUID();
  const customerEmail = `create-${suffix}@example.com`;
  const code = (prefix: string) => `${prefix}${suffix.slice(0, 8)}`.toUpperCase();
  const category = await prisma.category.create({ data: { slug: `create-${suffix}`, nameDe: "Test", nameEn: "Test" } });
  const promoIds: string[] = [];
  try {
    const product = await prisma.product.create({ data: { categoryId: category.id, slug: `create-${suffix}`, nameDe: "Test", nameEn: "Test", status: "ACTIVE" } });
    const variant = await prisma.productVariant.create({ data: { productId: product.id, nameDe: "T", nameEn: "T", priceRappen: 500, stockOnHand: 10 } });
    const minimum = await prisma.promoCode.create({ data: { code: code("MIN"), type: "FIXED", value: 300, minimumSubtotalRappen: 5000, perCustomerLimit: 1 } });
    const free = await prisma.promoCode.create({ data: { code: code("FREE"), type: "PERCENT", value: 10_000 } });
    promoIds.push(minimum.id, free.id);
    // Seeded databases already have the singleton; an unseeded test database needs it for quoting.
    await prisma.fulfillmentSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
    const stock = () => prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id }, select: { stockOnHand: true, stockReserved: true } });
    const order = (promoCode: string, paymentMethod: "STRIPE" | "PAY_AT_PICKUP", checkoutKey: string) => createOrder({
      checkoutKey, locale: "en", items: [{ variantId: variant.id, quantity: 2 }], fulfillmentType: "PICKUP", promoCode,
      customerName: "Create Test", customerEmail, customerPhone: "123456", paymentMethod,
    });
    const saved = (checkoutKey: string) => prisma.order.findUnique({ where: { checkoutKeyHash: hashToken(checkoutKey) }, include: { promoRedemption: true } });

    // CHF 10 basket with a "from CHF 50" code: no discount, so the code is not used up.
    const belowKey = crypto.randomUUID();
    const below = await order(minimum.code, "PAY_AT_PICKUP", belowKey);
    const belowOrder = await saved(belowKey);
    assert.equal(belowOrder?.discountRappen, 0);
    assert.equal(belowOrder?.totalRappen, 1000);
    assert.equal(belowOrder?.promoCodeId, null);
    assert.equal(belowOrder?.promoRedemption, null, "a code that gave no discount is not recorded as used");
    assert.deepEqual(await stock(), { stockOnHand: 8, stockReserved: 0 });

    // The same checkout key returns the same order and takes no more stock.
    assert.equal((await order(minimum.code, "PAY_AT_PICKUP", belowKey)).orderNumber, below.orderNumber);
    assert.deepEqual(await stock(), { stockOnHand: 8, stockReserved: 0 });

    // A code that covers the whole basket leaves nothing Stripe can charge: refused, and nothing is written.
    const cardKey = crypto.randomUUID();
    await assert.rejects(() => order(free.code, "STRIPE", cardKey), /CARD_MINIMUM_NOT_MET/);
    assert.equal(await saved(cardKey), null);
    assert.deepEqual(await stock(), { stockOnHand: 8, stockReserved: 0 });

    // The same free basket paid at pickup works, and this time the code counts.
    const freeKey = crypto.randomUUID();
    await order(free.code, "PAY_AT_PICKUP", freeKey);
    const freeOrder = await saved(freeKey);
    assert.equal(freeOrder?.totalRappen, 0);
    assert.equal(freeOrder?.promoCodeId, free.id);
    assert.equal(freeOrder?.promoRedemption?.discountRappen, 1000);
    assert.deepEqual(await stock(), { stockOnHand: 6, stockReserved: 0 });
  } finally {
    await prisma.order.deleteMany({ where: { customerEmail } });
    await prisma.inventoryMovement.deleteMany({ where: { variant: { product: { categoryId: category.id } } } });
    await prisma.product.deleteMany({ where: { categoryId: category.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.promoCode.deleteMany({ where: { id: { in: promoIds } } });
    await prisma.$disconnect();
  }
});
