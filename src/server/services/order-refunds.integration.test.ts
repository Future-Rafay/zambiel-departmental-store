import "dotenv/config";
import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type Stripe from "stripe";

import { formatOrderNumber } from "@/lib/orders";

test("refund settlement restores stock exactly once and partial refunds keep the order", async (context) => {
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

  const [{ prisma }, { adjustVariantStock, cancelOrder, syncStripeRefund }, { getStripe }] = await Promise.all([import("@/server/db"), import("@/server/services/admin"), import("@/server/payments/stripe")]);
  const suffix = crypto.randomUUID();
  const actor = await prisma.user.create({ data: { email: `refund-${suffix}@example.com`, role: "OWNER" } });
  const category = await prisma.category.create({ data: { slug: `refund-${suffix}`, nameDe: "Test", nameEn: "Test" } });
  const orderIds: bigint[] = [];
  try {
    const product = await prisma.product.create({ data: { categoryId: category.id, slug: `refund-${suffix}`, nameDe: "Test", nameEn: "Test", status: "ACTIVE" } });
    const variant = await prisma.productVariant.create({ data: { productId: product.id, nameDe: "T", nameEn: "T", priceRappen: 500, stockOnHand: 10 } });
    const stockOnHand = async () => (await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockOnHand;

    // A sold order: stock already left the shelf when payment confirmed.
    const soldOrder = async (provider: "STRIPE" | "CASH") => {
      const order = await prisma.order.create({ data: {
        checkoutKeyHash: crypto.randomUUID().replaceAll("-", "").padEnd(64, "0"),
        locale: "EN", customerName: "Refund Test", customerEmail: `refund-order-${suffix}@example.com`, customerPhone: "123456",
        fulfillmentType: "PICKUP", status: "CONFIRMED", paymentMethod: provider === "STRIPE" ? "STRIPE" : "PAY_AT_PICKUP",
        subtotalRappen: 1000, totalRappen: 1000,
        items: { create: { productId: product.id, variantId: variant.id, productNameDeSnapshot: "Test", productNameEnSnapshot: "Test", unitPriceRappen: 500, quantity: 2, lineSubtotalRappen: 1000 } },
        payment: { create: provider === "STRIPE" ? { provider, status: "PAID", amountRappen: 1000, stripePaymentIntentId: `pi_${crypto.randomUUID()}` } : { provider, status: "PENDING", amountRappen: 1000 } },
      }, include: { payment: true } });
      orderIds.push(order.id);
      await prisma.productVariant.update({ where: { id: variant.id }, data: { stockOnHand: { decrement: 2 } } });
      await prisma.inventoryMovement.create({ data: { variantId: variant.id, orderId: order.id, type: "ORDER_SOLD", quantityChange: -2, idempotencyKey: `order:${order.id}:${variant.id}:sell` } });
      return order;
    };
    const refundEvent = (id: string, cancel: boolean) => ({ id, status: "succeeded", metadata: { cancelOrder: String(cancel) }, failure_reason: null }) as unknown as Stripe.Refund;

    const full = await soldOrder("STRIPE");
    await prisma.refund.create({ data: { paymentId: full.payment!.id, requestedByUserId: actor.id, stripeRefundId: `re_full_${suffix}`, amountRappen: 1000, reason: "Customer request" } });
    assert.equal(await stockOnHand(), 8);
    await syncStripeRefund(refundEvent(`re_full_${suffix}`, true));
    await syncStripeRefund(refundEvent(`re_full_${suffix}`, true));
    const refunded = await prisma.order.findUniqueOrThrow({ where: { id: full.id }, include: { payment: true } });
    assert.equal(refunded.status, "CANCELLED");
    assert.equal(refunded.payment?.status, "REFUNDED");
    assert.equal(refunded.payment?.refundedRappen, 1000);
    assert.equal(await stockOnHand(), 10, "a replayed refund webhook restores stock once");
    assert.equal(await prisma.inventoryMovement.count({ where: { orderId: full.id, type: "ORDER_RESTORED" } }), 1);

    const partial = await soldOrder("STRIPE");
    await prisma.refund.create({ data: { paymentId: partial.payment!.id, requestedByUserId: actor.id, stripeRefundId: `re_partial_${suffix}`, amountRappen: 400, reason: "Damaged box" } });
    await syncStripeRefund(refundEvent(`re_partial_${suffix}`, false));
    const partlyRefunded = await prisma.order.findUniqueOrThrow({ where: { id: partial.id }, include: { payment: true } });
    assert.equal(partlyRefunded.status, "CONFIRMED");
    assert.equal(partlyRefunded.payment?.status, "PARTIALLY_REFUNDED");
    assert.equal(partlyRefunded.payment?.refundedRappen, 400);
    assert.equal(await stockOnHand(), 8, "partial refunds do not restock");
    await assert.rejects(() => cancelOrder(actor.id, formatOrderNumber(partial.id), "Paid orders need refund"), /OWNER_REFUND_REQUIRED/);

    const cash = await soldOrder("CASH");
    await cancelOrder(actor.id, formatOrderNumber(cash.id), "Customer did not collect");
    assert.equal(await stockOnHand(), 8);
    await assert.rejects(() => cancelOrder(actor.id, formatOrderNumber(cash.id), "Again"), /CANCELLATION_NOT_ALLOWED/);
    assert.equal(await stockOnHand(), 8, "a second cancel does not restock again");

    // Cancelling follows the ledger, not the variant's current trackInventory setting.
    const toggledOff = await soldOrder("CASH");
    assert.equal(await stockOnHand(), 6);
    await prisma.productVariant.update({ where: { id: variant.id }, data: { trackInventory: false } });
    await cancelOrder(actor.id, formatOrderNumber(toggledOff.id), "Tracking turned off");
    assert.equal(await stockOnHand(), 8, "sold stock returns even when tracking is now off");
    await prisma.productVariant.update({ where: { id: variant.id }, data: { trackInventory: true } });
    const neverSold = await prisma.order.create({ data: {
      checkoutKeyHash: crypto.randomUUID().replaceAll("-", "").padEnd(64, "0"),
      locale: "EN", customerName: "Untracked Test", customerEmail: `refund-order-${suffix}@example.com`, customerPhone: "123456",
      fulfillmentType: "PICKUP", status: "CONFIRMED", paymentMethod: "PAY_AT_PICKUP", subtotalRappen: 1000, totalRappen: 1000,
      items: { create: { productId: product.id, variantId: variant.id, productNameDeSnapshot: "Test", productNameEnSnapshot: "Test", unitPriceRappen: 500, quantity: 2, lineSubtotalRappen: 1000 } },
      payment: { create: { provider: "CASH", status: "PENDING", amountRappen: 1000 } },
    } });
    orderIds.push(neverSold.id);
    await cancelOrder(actor.id, formatOrderNumber(neverSold.id), "Tracking turned on later");
    assert.equal(await stockOnHand(), 8, "an order that never took stock gives none back");

    // Cancelling an unpaid Stripe order closes its open Checkout, and refuses once Checkout is complete.
    const sessions = getStripe().checkout.sessions;
    const pending = await prisma.order.create({ data: {
      checkoutKeyHash: crypto.randomUUID().replaceAll("-", "").padEnd(64, "0"),
      locale: "EN", customerName: "Pending Test", customerEmail: `refund-order-${suffix}@example.com`, customerPhone: "123456",
      fulfillmentType: "PICKUP", status: "PAYMENT_PENDING", paymentMethod: "STRIPE", subtotalRappen: 1000, totalRappen: 1000,
      payment: { create: { provider: "STRIPE", status: "PENDING", amountRappen: 1000, stripeCheckoutSessionId: `cs_${suffix}` } },
    } });
    orderIds.push(pending.id);
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stockReserved: 2 } });
    await prisma.inventoryMovement.create({ data: { variantId: variant.id, orderId: pending.id, type: "ORDER_RESERVED", quantityChange: -2, idempotencyKey: `order:${pending.id}:${variant.id}:reserve` } });
    const retrieve = mock.method(sessions, "retrieve", async () => ({ id: `cs_${suffix}`, status: "complete" }) as never);
    const expire = mock.method(sessions, "expire", async () => ({}) as never);
    await assert.rejects(() => cancelOrder(actor.id, formatOrderNumber(pending.id), "Too late"), /STRIPE_PAYMENT_IN_PROGRESS/);
    assert.equal(expire.mock.callCount(), 0);
    retrieve.mock.mockImplementation(async () => ({ id: `cs_${suffix}`, status: "open" }) as never);
    await cancelOrder(actor.id, formatOrderNumber(pending.id), "Customer changed mind");
    assert.equal(expire.mock.callCount(), 1);
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: pending.id } })).status, "CANCELLED");
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockReserved, 0, "cancelling releases the reservation");
    assert.equal(await stockOnHand(), 8, "releasing a reservation does not add stock");

    // Manual adjustments stay above reserved stock, and a double submit applies once.
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stockReserved: 5 } });
    const adjust = (quantityChange: number, adjustmentKey = crypto.randomUUID()) => adjustVariantStock(actor.id, { variantId: variant.id, quantityChange, reason: "Stock count", adjustmentKey });
    await assert.rejects(() => adjust(-4), /INVENTORY_BELOW_RESERVED/);
    assert.equal(await stockOnHand(), 8);
    const doubleSubmit = crypto.randomUUID();
    await adjust(-3, doubleSubmit);
    await adjust(-3, doubleSubmit);
    assert.equal(await stockOnHand(), 5);
    await adjust(2);
    assert.equal(await stockOnHand(), 7);
  } finally {
    mock.restoreAll();
    await prisma.auditLog.deleteMany({ where: { actorUserId: actor.id } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.inventoryMovement.deleteMany({ where: { variant: { product: { categoryId: category.id } } } });
    await prisma.product.deleteMany({ where: { categoryId: category.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.user.delete({ where: { id: actor.id } });
    await prisma.$disconnect();
  }
});
