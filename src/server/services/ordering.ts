import type Stripe from "stripe";

import { getStripeEnv } from "@/config/env";
import { siteConfig } from "@/config/site";
import type { Locale, OrderStatus } from "@/generated/prisma/enums";
import { allocateDiscount, formatOrderNumber, hashToken, nextOrderStatus, parseOrderNumber } from "@/lib/orders";
import { prisma } from "@/server/db";
import { orderConfirmationEmail, orderStatusEmail } from "@/server/email/templates";
import { getStripe } from "@/server/payments/stripe";
import { OrderError } from "@/server/services/order-errors";
import { sendOrderNotification } from "@/server/services/order-notifications";
import { calculateQuote } from "@/server/services/order-quotes";
import { failPendingOrder } from "@/server/services/order-stripe";
import { resolvePublicImageUrl } from "@/server/storage/s3";
import type { CreateOrderInput } from "@/server/validators/order";

export { OrderError } from "@/server/services/order-errors";
export { calculateQuote, getDeliveryQuote } from "@/server/services/order-quotes";
export { getAdminOrders, getCustomerOrders, getTrackedOrder } from "@/server/services/order-queries";
export { processStripeEvent } from "@/server/services/order-stripe";

function createdOrderDto(order: { id: bigint; status: OrderStatus; totalRappen: number }, trackingToken: string) {
  return { orderNumber: formatOrderNumber(order.id), status: order.status, totalRappen: order.totalRappen, trackingToken };
}
export async function createOrder(input: CreateOrderInput, userId?: string) {
  let stripeEnv: ReturnType<typeof getStripeEnv> | undefined;
  if (input.paymentMethod === "STRIPE") {
    try { stripeEnv = getStripeEnv(); } catch { throw new OrderError("PAYMENT_NOT_CONFIGURED"); }
  }
  const checkoutKeyHash = hashToken(input.checkoutKey);
  const existing = await prisma.order.findUnique({ where: { checkoutKeyHash }, include: { payment: true } });
  if (existing) return createdOrderDto(existing, input.checkoutKey);
  if (
    (input.fulfillmentType === "DELIVERY" && input.paymentMethod === "PAY_AT_PICKUP") ||
    (input.fulfillmentType === "PICKUP" && input.paymentMethod === "CASH_ON_DELIVERY") ||
    (input.fulfillmentType === "DELIVERY" && !input.address)
  ) throw new OrderError("PAYMENT_OR_ADDRESS_INVALID");

  const order = await prisma.$transaction(async (tx) => {
    const quote = await calculateQuote(input, tx, userId);
    const status: OrderStatus = input.paymentMethod === "STRIPE" ? "PAYMENT_PENDING" : "CONFIRMED";
    const created = await tx.order.create({
      data: {
        checkoutKeyHash,
        guestTrackingTokenHash: userId ? null : checkoutKeyHash,
        userId,
        locale: input.locale.toUpperCase() as Locale,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        fulfillmentType: input.fulfillmentType,
        status,
        paymentMethod: input.paymentMethod,
        note: input.note,
        subtotalRappen: quote.subtotalRappen,
        discountRappen: quote.discountRappen,
        deliveryFeeRappen: quote.deliveryFeeRappen,
        totalRappen: quote.totalRappen,
        promoCodeId: quote.promo?.id,
        deliveryZoneId: quote.delivery?.zoneId,
        deliveryZoneNameDeSnapshot: quote.delivery?.nameDe,
        deliveryZoneNameEnSnapshot: quote.delivery?.nameEn,
        address: input.address ? { create: input.address } : undefined,
        items: {
          create: quote.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productNameDeSnapshot: item.productNameDe,
            productNameEnSnapshot: item.productNameEn,
            variantNameDeSnapshot: item.variantNameDe,
            variantNameEnSnapshot: item.variantNameEn,
            unitPriceRappen: item.unitPriceRappen,
            quantity: item.quantity,
            lineSubtotalRappen: item.lineSubtotalRappen,
            options: {
              create: item.choices.map((choice) => ({
                optionChoiceId: choice.id,
                nameDeSnapshot: choice.nameDe,
                nameEnSnapshot: choice.nameEn,
                priceDeltaRappen: choice.priceDeltaRappen,
              })),
            },
          })),
        },
        payment: {
          create: {
            provider: input.paymentMethod === "STRIPE" ? "STRIPE" : "CASH",
            status: "PENDING",
            amountRappen: quote.totalRappen,
          },
        },
        statusEvents: { create: { toStatus: status, reason: "ORDER_CREATED" } },
        promoRedemption: quote.promo ? {
          create: {
            promoCodeId: quote.promo.id,
            userId,
            customerEmail: input.customerEmail,
            discountRappen: quote.discountRappen,
          },
        } : undefined,
      },
      include: { payment: true, items: { include: { options: true, product: { select: { imageKey: true } } } } },
    });
    for (const item of quote.items) {
      const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId }, select: { trackInventory: true } });
      if (!variant.trackInventory) continue;
      const changed = input.paymentMethod === "STRIPE"
        ? await tx.$executeRaw`UPDATE productvariant SET stockReserved = stockReserved + ${item.quantity}, updatedAt = NOW(3) WHERE id = ${item.variantId} AND active = 1 AND stockOnHand - stockReserved >= ${item.quantity}`
        : await tx.$executeRaw`UPDATE productvariant SET stockOnHand = stockOnHand - ${item.quantity}, updatedAt = NOW(3) WHERE id = ${item.variantId} AND active = 1 AND stockOnHand - stockReserved >= ${item.quantity}`;
      if (changed !== 1) throw new OrderError("OUT_OF_STOCK");
      await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          orderId: created.id,
          type: input.paymentMethod === "STRIPE" ? "ORDER_RESERVED" : "ORDER_SOLD",
          quantityChange: -item.quantity,
          reason: input.paymentMethod === "STRIPE" ? "Stripe checkout stock reservation" : "Order confirmed",
          idempotencyKey: `order:${created.id}:${item.variantId}:${input.paymentMethod === "STRIPE" ? "reserve" : "sell"}`,
        },
      });
    }
    return created;
  }, { isolationLevel: "Serializable" });

  if (input.paymentMethod === "STRIPE") {
    try {
      const orderNumber = formatOrderNumber(order.id);
      const discountedTotals = allocateDiscount(order.items.map((item) => item.lineSubtotalRappen), order.discountRappen);
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item, index) => {
        const options = item.options.map((option) => input.locale === "de" ? option.nameDeSnapshot : option.nameEnSnapshot);
        const imageUrl = resolvePublicImageUrl(item.product?.imageKey);
        const absoluteImageUrl = imageUrl && (imageUrl.startsWith("http") ? imageUrl : new URL(imageUrl, stripeEnv!.APP_URL).toString());
        return { quantity: 1, price_data: { currency: siteConfig.currency.toLowerCase(), unit_amount: discountedTotals[index], product_data: {
          name: `${item.quantity}× ${input.locale === "de" ? item.productNameDeSnapshot : item.productNameEnSnapshot}`,
          description: [input.locale === "de" ? item.variantNameDeSnapshot : item.variantNameEnSnapshot, ...options].filter(Boolean).join(" · ") || undefined,
          images: absoluteImageUrl ? [absoluteImageUrl] : undefined,
        } } };
      });
      if (order.deliveryFeeRappen > 0) lineItems.push({ quantity: 1, price_data: { currency: siteConfig.currency.toLowerCase(), unit_amount: order.deliveryFeeRappen, product_data: { name: input.locale === "de" ? "Liefergebühr" : "Delivery fee" } } });
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        customer_email: order.customerEmail,
        line_items: lineItems,
        metadata: { orderId: order.id.toString(), orderNumber },
        success_url: `${stripeEnv!.APP_URL}/${input.locale}/orders/${orderNumber}?token=${input.checkoutKey}`,
        cancel_url: `${stripeEnv!.APP_URL}/${input.locale}/checkout?cancelled=1`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      }, { idempotencyKey: input.checkoutKey });
      await prisma.payment.update({ where: { orderId: order.id }, data: { stripeCheckoutSessionId: session.id } });
      return { ...createdOrderDto(order, input.checkoutKey), checkoutUrl: session.url };
    } catch (error) {
      await failPendingOrder(order.id);
      throw error;
    }
  }

  await sendOrderNotification(
    order.id,
    "confirmed",
    order.customerEmail,
    orderConfirmationEmail({ orderNumber: formatOrderNumber(order.id) }),
  );
  return createdOrderDto(order, input.checkoutKey);
}

export async function advanceOrder(orderNumber: string, expectedVersion: number, actorUserId: string) {
  const id = parseOrderNumber(orderNumber);
  if (!id) throw new OrderError("ORDER_NOT_FOUND");
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id } });
    const next = nextOrderStatus(order.status, order.fulfillmentType);
    if (!next) throw new OrderError("TRANSITION_NOT_ALLOWED");
    const result = await tx.order.updateMany({
      where: { id, version: expectedVersion, status: order.status },
      data: { status: next, version: { increment: 1 }, ...(["DELIVERED", "PICKED_UP"].includes(next) ? { completedAt: new Date() } : {}) },
    });
    if (result.count !== 1) throw new OrderError("ORDER_CHANGED");
    await tx.orderStatusEvent.create({
      data: { orderId: id, actorUserId, fromStatus: order.status, toStatus: next },
    });
    return tx.order.findUniqueOrThrow({ where: { id } });
  });
  await sendOrderNotification(
    updated.id,
    `status-${updated.status.toLowerCase()}`,
    updated.customerEmail,
    orderStatusEmail({ orderNumber: formatOrderNumber(updated.id), status: updated.status, locale: updated.locale }),
  );
  return { status: updated.status, version: updated.version };
}

export async function setProductAvailability(productId: string, available: boolean, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.update({ where: { id: productId }, data: { available } });
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: available ? "PRODUCT_AVAILABLE" : "PRODUCT_SOLD_OUT",
        entityType: "Product",
        entityId: product.id,
      },
    });
    return { id: product.id, available: product.available };
  });
}

export async function confirmCashPayment(orderNumber: string, actorUserId: string) {
  const id = parseOrderNumber(orderNumber);
  if (!id) throw new OrderError("ORDER_NOT_FOUND");
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { orderId: id } });
    if (payment.provider !== "CASH" || payment.status !== "PENDING") {
      throw new OrderError("CASH_CONFIRMATION_NOT_ALLOWED");
    }
    const now = new Date();
    await tx.payment.update({ where: { orderId: id }, data: { status: "PAID", paidAt: now } });
    await tx.order.update({ where: { id }, data: { version: { increment: 1 }, updatedAt: now } });
    await tx.auditLog.create({
      data: { actorUserId, action: "CASH_PAYMENT_CONFIRMED", entityType: "Order", entityId: id.toString() },
    });
    return { paymentStatus: "PAID" as const };
  });
}
