import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";

import { siteConfig } from "@/config/site";
import { formatOrderNumber } from "@/lib/orders";
import { createOrderSchema, quoteSchema } from "@/server/validators/order";

const cart = [{ variantId: "variant", quantity: 1 }];

test("checkout schemas require delivery details and compatible payment", () => {
  const quote = quoteSchema.safeParse({ items: cart, fulfillmentType: "DELIVERY" });
  assert.equal(quote.success, false);
  assert.deepEqual(quote.error?.issues[0]?.path, ["countryCode"]);

  const order = createOrderSchema.safeParse({
    items: cart,
    fulfillmentType: "DELIVERY",
    countryCode: "PK",
    checkoutKey: crypto.randomUUID(),
    locale: siteConfig.locale,
    customerName: "Test Customer",
    customerEmail: "test@example.com",
    customerPhone: "123456",
    paymentMethod: "PAY_AT_PICKUP",
    address: { recipientName: "Test Customer", phone: "123456", street: "Teststrasse 1", city: "Oberglatt", countryCode: "CH" },
  });
  assert.equal(order.success, false);
  assert.deepEqual(order.error?.issues.map((issue) => issue.path), [["address", "countryCode"], ["paymentMethod"]]);

  const invoiceBase = {
    items: cart,
    fulfillmentType: "PICKUP" as const,
    checkoutKey: crypto.randomUUID(),
    locale: siteConfig.locale,
    customerName: "Business Customer",
    customerEmail: "business@example.com",
    customerPhone: "123456",
    paymentMethod: "INVOICE_BANK_TRANSFER" as const,
  };
  assert.equal(createOrderSchema.safeParse(invoiceBase).success, false);
  assert.equal(createOrderSchema.safeParse({ ...invoiceBase, storeMode: "b2b" }).success, true);
});

test("Stripe events are replayable, delayed payments settle, failures cancel, and cash creates activity", async (context) => {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl || testDatabaseUrl === process.env.DATABASE_URL) {
    context.skip("TEST_DATABASE_URL must point to a separate isolated database.");
    return;
  }

  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DATABASE_CONNECTION_LIMIT = "1";
  process.env.DATABASE_SSL ??= "false";

  const [{ prisma }, { confirmCashPayment, getCustomerOrders, processStripeEvent }, { confirmInvoicePayment, getOrderHistory, setCustomerB2bAccess }] = await Promise.all([
    import("@/server/db"),
    import("@/server/services/ordering"),
    import("@/server/services/admin"),
  ]);
  const suffix = crypto.randomUUID();
  const eventIds: string[] = [];
  const orderIds: bigint[] = [];
  let actorId: string | undefined;
  let customerId: string | undefined;
  let otherOwnerId: string | undefined;

  const createStripeOrder = async (sessionId: string) => {
    const order = await prisma.order.create({
      data: {
        checkoutKeyHash: crypto.randomUUID().replaceAll("-", "").padEnd(64, "0"),
        locale: "EN",
        customerName: "Webhook Test",
        customerEmail: `webhook-${suffix}@example.com`,
        customerPhone: "123456",
        fulfillmentType: "PICKUP",
        status: "PAYMENT_PENDING",
        paymentMethod: "STRIPE",
        subtotalRappen: 1000,
        totalRappen: 1000,
        payment: { create: { provider: "STRIPE", status: "PENDING", amountRappen: 1000, stripeCheckoutSessionId: sessionId } },
        statusEvents: { create: { toStatus: "PAYMENT_PENDING", reason: "ORDER_CREATED" } },
      },
    });
    orderIds.push(order.id);
    return order;
  };
  const checkoutEvent = (id: string, type: Stripe.Event.Type, sessionId: string, orderId: bigint, paymentStatus: "paid" | "unpaid", currency = siteConfig.currency.toLowerCase()) => ({
    id,
    type,
    data: { object: {
      id: sessionId,
      object: "checkout.session",
      amount_total: 1000,
      currency,
      metadata: { orderId: orderId.toString(), orderNumber: formatOrderNumber(orderId) },
      payment_intent: paymentStatus === "paid" ? `pi_${suffix}` : null,
      payment_status: paymentStatus,
    } },
  }) as unknown as Stripe.Event;

  try {
    const replayId = `evt_replay_${suffix}`;
    eventIds.push(replayId);
    await prisma.stripeWebhookEvent.create({ data: { eventId: replayId, type: "customer.created", status: "FAILED", error: "Previous delivery failed" } });
    const replay = { id: replayId, type: "customer.created" } as Stripe.Event;
    await processStripeEvent(replay);
    await processStripeEvent(replay);
    assert.equal(await prisma.stripeWebhookEvent.count({ where: { eventId: replayId } }), 1);

    const wrongCurrencyOrder = await createStripeOrder(`cs_currency_${suffix}`);
    const wrongCurrencyId = `evt_currency_${suffix}`;
    eventIds.push(wrongCurrencyId);
    await assert.rejects(() => processStripeEvent(checkoutEvent(wrongCurrencyId, "checkout.session.completed", `cs_currency_${suffix}`, wrongCurrencyOrder.id, "paid", "xxx")));
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: wrongCurrencyOrder.id } })).status, "PAYMENT_PENDING");

    const paidOrder = await createStripeOrder(`cs_paid_${suffix}`);
    const paidPushToken = `ExpoPushToken[paid_${suffix.replaceAll("-", "_")}]`;
    await prisma.customerPushSubscription.create({ data: { token: paidPushToken, scopeKey: `paid:${suffix}`, orderId: paidOrder.id, locale: "EN" } });
    const pendingId = `evt_pending_${suffix}`;
    const paidId = `evt_paid_${suffix}`;
    eventIds.push(pendingId, paidId);
    await processStripeEvent(checkoutEvent(pendingId, "checkout.session.completed", `cs_paid_${suffix}`, paidOrder.id, "unpaid"));
    assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: paidOrder.id } })).status, "PAYMENT_PENDING");
    await processStripeEvent(checkoutEvent(paidId, "checkout.session.async_payment_succeeded", `cs_paid_${suffix}`, paidOrder.id, "paid"));
    await processStripeEvent(checkoutEvent(paidId, "checkout.session.async_payment_succeeded", `cs_paid_${suffix}`, paidOrder.id, "paid"));
    const settled = await prisma.order.findUniqueOrThrow({ where: { id: paidOrder.id }, include: { payment: true, statusEvents: true } });
    assert.equal(settled.status, "CONFIRMED");
    assert.equal(settled.payment?.status, "PAID");
    assert.equal(settled.payment?.stripePaymentIntentId, `pi_${suffix}`);
    assert.equal(settled.statusEvents.filter((event) => event.reason === "STRIPE_PAID").length, 1);
    assert.equal(await prisma.notificationDelivery.count({ where: { orderId: paidOrder.id, channel: "PUSH", kind: "CONFIRMED" } }), 1);

    const failedOrder = await createStripeOrder(`cs_failed_${suffix}`);
    await prisma.customerPushSubscription.create({ data: { token: `ExpoPushToken[failed_${suffix.replaceAll("-", "_")}]`, scopeKey: `failed:${suffix}`, orderId: failedOrder.id, locale: "EN" } });
    const failedId = `evt_failed_${suffix}`;
    eventIds.push(failedId);
    await processStripeEvent(checkoutEvent(failedId, "checkout.session.async_payment_failed", `cs_failed_${suffix}`, failedOrder.id, "unpaid"));
    const failed = await prisma.order.findUniqueOrThrow({ where: { id: failedOrder.id }, include: { statusEvents: true } });
    assert.equal(failed.status, "CANCELLED");
    assert.equal(failed.statusEvents.at(-1)?.reason, "STRIPE_PAYMENT_FAILED");
    assert.equal(await prisma.notificationDelivery.count({ where: { orderId: failedOrder.id, channel: "PUSH", kind: "CANCELLED" } }), 1);

    const actor = await prisma.user.create({ data: { email: `cash-${suffix}@example.com`, role: "OWNER" } });
    actorId = actor.id;
    const cashOrder = await prisma.order.create({
      data: {
        checkoutKeyHash: crypto.randomUUID().replaceAll("-", "").padEnd(64, "0"),
        userId: actor.id,
        locale: "EN",
        customerName: "Cash Test",
        customerEmail: actor.email,
        customerPhone: "123456",
        fulfillmentType: "PICKUP",
        status: "CONFIRMED",
        paymentMethod: "PAY_AT_PICKUP",
        subtotalRappen: 1000,
        totalRappen: 1000,
        payment: { create: { provider: "CASH", status: "PENDING", amountRappen: 1000 } },
        statusEvents: { create: { toStatus: "CONFIRMED", reason: "ORDER_CREATED" } },
      },
    });
    orderIds.push(cashOrder.id);
    await confirmCashPayment(formatOrderNumber(cashOrder.id), actor.id);
    const customerOrder = (await getCustomerOrders(actor.id)).find((order) => order.orderNumber === formatOrderNumber(cashOrder.id));
    const cashActivity = customerOrder?.activities.find((activity) => activity.kind === "CASH_PAYMENT_CONFIRMED");
    assert.equal(customerOrder?.version, 1);
    assert.equal(customerOrder?.activityAt, cashActivity?.at);

    const customer = await prisma.user.create({ data: { email: `b2b-${suffix}@example.com`, role: "CUSTOMER", b2b_status: "PENDING" } });
    customerId = customer.id;
    await setCustomerB2bAccess(actor.id, customer.id, true);
    await setCustomerB2bAccess(actor.id, customer.id, true);
    assert.deepEqual(await prisma.user.findUnique({ where: { id: customer.id }, select: { b2b_status: true, is_b2b_authorized: true } }), { b2b_status: "APPROVED", is_b2b_authorized: true });
    await setCustomerB2bAccess(actor.id, actor.id, true);
    assert.deepEqual(await prisma.user.findUnique({ where: { id: actor.id }, select: { b2b_status: true, is_b2b_authorized: true } }), { b2b_status: "APPROVED", is_b2b_authorized: true });
    const otherOwner = await prisma.user.create({ data: { email: `other-owner-${suffix}@example.com`, role: "OWNER" } });
    otherOwnerId = otherOwner.id;
    await assert.rejects(() => setCustomerB2bAccess(actor.id, otherOwner.id, true));

    const invoiceOrder = await prisma.order.create({ data: { checkoutKeyHash: crypto.randomUUID().replaceAll("-", "").padEnd(64, "0"), userId: customer.id, locale: "EN", customerName: "B2B Test", customerEmail: customer.email, customerPhone: "123456", fulfillmentType: "DELIVERY", status: "CONFIRMED", paymentMethod: "INVOICE_BANK_TRANSFER", subtotalRappen: 2000, totalRappen: 2000, payment: { create: { provider: "INVOICE_BANK_TRANSFER", status: "PENDING_VERIFICATION", amountRappen: 2000 } }, statusEvents: { create: { toStatus: "CONFIRMED", reason: "ORDER_CREATED" } } } });
    orderIds.push(invoiceOrder.id);
    assert.equal((await getOrderHistory("UNPAID_B2B")).some(({ id }) => id === invoiceOrder.id.toString()), true);
    await confirmInvoicePayment(formatOrderNumber(invoiceOrder.id), actor.id);
    await assert.rejects(() => confirmInvoicePayment(formatOrderNumber(invoiceOrder.id), actor.id));
    const paidInvoice = await prisma.order.findUniqueOrThrow({ where: { id: invoiceOrder.id }, include: { payment: true } });
    assert.equal(paidInvoice.status, "CONFIRMED");
    assert.equal(paidInvoice.version, 1);
    assert.equal(paidInvoice.payment?.status, "PAID");
    assert.ok(paidInvoice.payment?.paidAt);
  } finally {
    await prisma.auditLog.deleteMany({ where: { entityType: "Order", entityId: { in: orderIds.map(String) } } });
    if (customerId) await prisma.auditLog.deleteMany({ where: { entityType: "User", entityId: customerId } });
    if (actorId) await prisma.auditLog.deleteMany({ where: { entityType: "User", entityId: actorId } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.stripeWebhookEvent.deleteMany({ where: { eventId: { in: eventIds } } });
    if (actorId) await prisma.user.deleteMany({ where: { id: actorId } });
    if (otherOwnerId) await prisma.user.deleteMany({ where: { id: otherOwnerId } });
    if (customerId) await prisma.user.deleteMany({ where: { id: customerId } });
    await prisma.$disconnect();
  }
});
