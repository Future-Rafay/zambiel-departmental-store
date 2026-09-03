import type Stripe from "stripe";

import { siteConfig } from "@/config/site";
import { Prisma } from "@/generated/prisma/client";
import { formatOrderNumber } from "@/lib/orders";
import { prisma } from "@/server/db";
import { orderConfirmationEmail } from "@/server/email/templates";
import { syncStripeRefund } from "@/server/services/admin";
import { OrderError } from "@/server/services/order-errors";
import { sendOrderNotification } from "@/server/services/order-notifications";

type StripeOrder = Prisma.OrderGetPayload<{ include: { payment: true } }>;

function stripeOrderId(session: Stripe.Checkout.Session) {
  const value = session.metadata?.orderId;
  if (!value || !/^\d+$/.test(value)) throw new OrderError("STRIPE_EVENT_INVALID");
  return BigInt(value);
}

function assertStripeSession(order: StripeOrder, session: Stripe.Checkout.Session) {
  if (order.payment?.provider !== "STRIPE" || order.payment.stripeCheckoutSessionId !== session.id || session.currency !== siteConfig.currency.toLowerCase() || session.amount_total !== order.payment.amountRappen || session.metadata?.orderNumber !== formatOrderNumber(order.id)) throw new OrderError("STRIPE_EVENT_INVALID");
}

export async function failPendingOrder(orderId: bigint, reason = "PAYMENT_SESSION_FAILED", session?: Stripe.Checkout.Session) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { payment: true, items: { select: { variantId: true, quantity: true } } } });
    if (session) assertStripeSession(order, session);
    if (order.status !== "PAYMENT_PENDING") return;
    const now = new Date();
    const cancellation = await tx.order.updateMany({ where: { id: orderId, status: "PAYMENT_PENDING" }, data: { status: "CANCELLED", version: { increment: 1 }, cancelledAt: now, cancellationReason: reason } });
    if (cancellation.count !== 1) return;
    await tx.payment.update({ where: { orderId }, data: { status: "FAILED", failedAt: now } });
    await tx.orderStatusEvent.create({ data: { orderId, fromStatus: "PAYMENT_PENDING", toStatus: "CANCELLED", reason } });
    for (const item of order.items) {
      if (!item.variantId) continue;
      const released = await tx.$executeRaw`UPDATE productvariant SET stockReserved = stockReserved - ${item.quantity}, updatedAt = NOW(3) WHERE id = ${item.variantId} AND stockReserved >= ${item.quantity}`;
      if (released !== 1) throw new OrderError("INVENTORY_RESERVATION_INVALID");
      await tx.inventoryMovement.create({ data: { variantId: item.variantId, orderId, type: "ORDER_RELEASED", quantityChange: item.quantity, reason, idempotencyKey: `order:${orderId}:${item.variantId}:release` } });
    }
  });
}

async function claimStripeEvent(event: Stripe.Event) {
  const replay = await prisma.stripeWebhookEvent.updateMany({
    where: { eventId: event.id, OR: [{ status: "FAILED" }, { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } }] },
    data: { status: "PROCESSING", error: null, processedAt: null },
  });
  if (replay.count === 1) return true;
  try {
    await prisma.stripeWebhookEvent.create({ data: { eventId: event.id, type: event.type } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}

async function validateStripeSession(session: Stripe.Checkout.Session) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: stripeOrderId(session) }, include: { payment: true } });
  assertStripeSession(order, session);
}

export async function finalizePaidStripeSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") throw new OrderError("STRIPE_EVENT_INVALID");
  return prisma.$transaction(async (tx) => {
    const orderId = stripeOrderId(session);
    const current = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { payment: true, items: { include: { variant: { select: { trackInventory: true } } } } } });
    assertStripeSession(current, session);
    if (current.status !== "PAYMENT_PENDING") {
      if (current.payment?.status !== "PAID") throw new OrderError("STRIPE_EVENT_INVALID");
      return null;
    }
    const now = new Date();
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!paymentIntentId) throw new OrderError("STRIPE_EVENT_INVALID");
    const payment = await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "PAID", stripePaymentIntentId: paymentIntentId, paidAt: now } });
    if (payment.count !== 1) throw new OrderError("STRIPE_EVENT_INVALID");
    for (const item of current.items) {
      if (!item.variantId || !item.variant?.trackInventory) continue;
      const consumed = await tx.$executeRaw`UPDATE productvariant SET stockOnHand = stockOnHand - ${item.quantity}, stockReserved = stockReserved - ${item.quantity}, updatedAt = NOW(3) WHERE id = ${item.variantId} AND stockOnHand >= ${item.quantity} AND stockReserved >= ${item.quantity}`;
      if (consumed !== 1) throw new OrderError("INVENTORY_RESERVATION_INVALID");
      await tx.inventoryMovement.create({ data: { variantId: item.variantId, orderId, type: "ORDER_SOLD", quantityChange: -item.quantity, reason: "Stripe payment confirmed", idempotencyKey: `order:${orderId}:${item.variantId}:sell` } });
    }
    await tx.orderStatusEvent.create({ data: { orderId, fromStatus: "PAYMENT_PENDING", toStatus: "CONFIRMED", reason: "STRIPE_PAID" } });
    return tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED", version: { increment: 1 } } });
  });
}

export async function processStripeEvent(event: Stripe.Event) {
  if (!(await claimStripeEvent(event))) return;
  let confirmedOrder: Awaited<ReturnType<typeof finalizePaidStripeSession>> = null;
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.payment_status === "paid") confirmedOrder = await finalizePaidStripeSession(session);
      else await validateStripeSession(session);
    } else if (event.type === "checkout.session.async_payment_succeeded") confirmedOrder = await finalizePaidStripeSession(event.data.object);
    else if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      await failPendingOrder(stripeOrderId(session), "STRIPE_PAYMENT_FAILED", session);
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      await failPendingOrder(stripeOrderId(session), "PAYMENT_SESSION_EXPIRED", session);
    } else if (event.type === "refund.created" || event.type === "refund.updated" || event.type === "refund.failed") await syncStripeRefund(event.data.object);
    await prisma.stripeWebhookEvent.update({ where: { eventId: event.id }, data: { status: "PROCESSED", processedAt: new Date() } });
  } catch (error) {
    await prisma.stripeWebhookEvent.update({ where: { eventId: event.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Webhook failed" } });
    throw error;
  }
  if (confirmedOrder) await sendOrderNotification(confirmedOrder.id, "confirmed", confirmedOrder.customerEmail, orderConfirmationEmail({ orderNumber: formatOrderNumber(confirmedOrder.id) }));
}
