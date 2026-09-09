import "dotenv/config";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { formatOrderNumber } from "@/lib/orders";

test("notification claims are exclusive and availability auditing is transactional", async (context) => {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl || testDatabaseUrl === process.env.DATABASE_URL) {
    context.skip("TEST_DATABASE_URL must point to a migrated isolated database.");
    return;
  }

  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DATABASE_CONNECTION_LIMIT = "4";
  process.env.DATABASE_SSL ??= "false";
  process.env.RESEND_API_KEY = "re_placeholder";

  const [{ prisma }, { sendOrderNotification }, { advanceOrder, setProductAvailability }] = await Promise.all([
    import("@/server/db"),
    import("@/server/services/order-notifications"),
    import("@/server/services/ordering"),
  ]);
  const suffix = crypto.randomUUID();
  const actor = await prisma.user.create({ data: { email: `notification-${suffix}@example.com`, role: "OWNER" } });
  const category = await prisma.category.create({ data: { slug: `notification-${suffix}`, nameDe: "Test", nameEn: "Test" } });
  const product = await prisma.product.create({ data: { categoryId: category.id, slug: `notification-${suffix}`, nameDe: "Test", nameEn: "Test", status: "ACTIVE" } });
  const order = await prisma.order.create({ data: {
    checkoutKeyHash: crypto.randomUUID().replaceAll("-", "").padEnd(64, "0"),
    locale: "EN",
    customerName: "Notification Test",
    customerEmail: `order-${suffix}@example.com`,
    customerPhone: "123456",
    fulfillmentType: "PICKUP",
    status: "CONFIRMED",
    paymentMethod: "PAY_AT_PICKUP",
    subtotalRappen: 1_000,
    totalRappen: 1_000,
  } });
  const pushToken = `ExpoPushToken[${suffix.replaceAll("-", "_")}]`;
  await prisma.customerPushSubscription.create({ data: { token: pushToken, scopeKey: `test:${suffix}`, orderId: order.id, locale: "EN" } });
  const message = { subject: "Test", text: "Test", html: "<p>Test</p>" };

  try {
    let sends = 0;
    const results = await Promise.all(Array.from({ length: 8 }, () => sendOrderNotification(order.id, `concurrent-${suffix}`, order.customerEmail, message, async () => {
      sends += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { id: "sent-once" };
    })));
    assert.equal(sends, 1);
    assert.equal(results.filter(Boolean).length, 1);

    assert.equal(await sendOrderNotification(order.id, `retry-${suffix}`, order.customerEmail, message, async () => { throw new Error("provider failed"); }), false);
    assert.equal(await sendOrderNotification(order.id, `retry-${suffix}`, order.customerEmail, message, async () => ({ id: "retried" })), true);
    const retried = await prisma.notificationDelivery.findUniqueOrThrow({ where: { deduplicationKey: `order:${order.id}:retry-${suffix}:email` } });
    assert.equal(retried.status, "SENT");
    assert.equal(retried.attemptCount, 2);

    await prisma.notificationDelivery.create({ data: {
      orderId: order.id,
      channel: "EMAIL",
      kind: `stale-${suffix}`,
      recipient: order.customerEmail,
      deduplicationKey: `order:${order.id}:stale-${suffix}:email`,
      updatedAt: new Date(Date.now() - 6 * 60 * 1000),
    } });
    assert.equal(await sendOrderNotification(order.id, `stale-${suffix}`, order.customerEmail, message, async () => ({ id: "reclaimed" })), true);

    const transition = await advanceOrder(formatOrderNumber(order.id), 0, actor.id);
    assert.equal(transition.status, "PROCESSING");
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "PROCESSING");
    const push = await prisma.notificationDelivery.findUniqueOrThrow({ where: { deduplicationKey: `push:${order.id}:PROCESSING:${createHash("sha256").update(pushToken).digest("hex")}` } });
    assert.equal(push.status, "PENDING");

    await assert.rejects(() => setProductAvailability(product.id, false, "missing-actor"));
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).available, true);
    await setProductAvailability(product.id, false, actor.id);
    assert.equal(await prisma.auditLog.count({ where: { entityType: "Product", entityId: product.id, action: "PRODUCT_SOLD_OUT" } }), 1);
  } finally {
    await prisma.auditLog.deleteMany({ where: { OR: [{ entityType: "Product", entityId: product.id }, { entityType: "Order", entityId: order.id.toString() }] } });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.user.delete({ where: { id: actor.id } });
    await prisma.$disconnect();
  }
});
