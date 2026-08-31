import type Stripe from "stripe";

import { siteConfig } from "@/config/site";
import { Prisma } from "@/generated/prisma/client";
import type { Locale, OrderStatus } from "@/generated/prisma/enums";
import { getStripeEnv } from "@/config/env";
import { allocateDiscount, formatOrderNumber, hashToken, nextOrderStatus, parseOrderNumber, promoDiscount, publicOrderAddress } from "@/lib/orders";
import { prisma } from "@/server/db";
import { sendEmail } from "@/server/email/client";
import { orderConfirmationEmail, orderStatusEmail } from "@/server/email/templates";
import { getStripe } from "@/server/payments/stripe";
import { resolveProductMediaUrl, resolvePublicImageUrl } from "@/server/storage/s3";
import { syncStripeRefund } from "@/server/services/admin";
import type { CreateOrderInput, QuoteInput } from "@/server/validators/order";

type Db = Prisma.TransactionClient | typeof prisma;

export class OrderError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

async function findPromo(db: Db, code?: string, email?: string, userId?: string) {
  if (!code) return null;
  const now = new Date();
  const promo = await db.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!promo || !promo.active || (promo.startsAt && promo.startsAt > now) || (promo.endsAt && promo.endsAt < now)) {
    throw new OrderError("PROMO_INVALID");
  }
  const [totalUses, customerUses] = await Promise.all([
    promo.totalUsageLimit === null ? Promise.resolve(0) : db.promoRedemption.count({ where: { promoCodeId: promo.id } }),
    promo.perCustomerLimit === null || !email
      ? Promise.resolve(0)
      : db.promoRedemption.count({
          where: { promoCodeId: promo.id, OR: [{ customerEmail: email }, ...(userId ? [{ userId }] : [])] },
        }),
  ]);
  if (
    (promo.totalUsageLimit !== null && totalUses >= promo.totalUsageLimit) ||
    (promo.perCustomerLimit !== null && customerUses >= promo.perCustomerLimit)
  ) throw new OrderError("PROMO_LIMIT_REACHED");
  return promo;
}

export async function getDeliveryQuote(postcode: string, subtotalRappen: number, db: Db = prisma) {
  const match = await db.deliveryZonePostalCode.findUnique({
    where: { postalCode: postcode },
    include: { deliveryZone: true },
  });
  if (!match?.deliveryZone.active) throw new OrderError("POSTCODE_NOT_DELIVERABLE");
  const zone = match.deliveryZone;
  const remainingToMinimumRappen = Math.max(0, zone.minimumSubtotalRappen - subtotalRappen);
  return {
    zoneId: zone.id,
    nameDe: zone.nameDe,
    nameEn: zone.nameEn,
    deliveryFeeRappen:
      zone.freeDeliveryThresholdRappen !== null && subtotalRappen >= zone.freeDeliveryThresholdRappen ? 0 : zone.feeRappen,
    minimumSubtotalRappen: zone.minimumSubtotalRappen,
    remainingToMinimumRappen,
    freeDeliveryThresholdRappen: zone.freeDeliveryThresholdRappen,
    estimatedMinutes: zone.estimatedMinutes,
    eligible: remainingToMinimumRappen === 0,
  };
}

export async function calculateQuote(input: QuoteInput, db: Db = prisma, userId?: string) {
  const settings = await db.fulfillmentSettings.findUniqueOrThrow({ where: { id: 1 } });
  if (
    (input.fulfillmentType === "DELIVERY" && !settings.deliveryEnabled) ||
    (input.fulfillmentType === "PICKUP" && !settings.pickupEnabled)
  ) throw new OrderError("FULFILLMENT_DISABLED");
  const quantities = new Map<string, number>();
  for (const item of input.items) quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);

  const variants = await db.productVariant.findMany({
    where: { id: { in: [...quantities.keys()] }, active: true, deletedAt: null },
    include: {
      product: {
        include: {
          media: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
      optionValues: { include: { optionValue: { include: { option: true } } } },
    },
  });
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const items = [...quantities].map(([variantId, quantity]) => {
    const variant = variantsById.get(variantId);
    if (!variant || variant.product.status !== "ACTIVE" || !variant.product.active || variant.product.deletedAt || !variant.product.available) {
      throw new OrderError("PRODUCT_UNAVAILABLE");
    }
    if (variant.trackInventory && variant.stockOnHand - variant.stockReserved < quantity) throw new OrderError("OUT_OF_STOCK");
    const unitPriceRappen = variant.priceRappen;
    return {
      productId: variant.product.id,
      variantId: variant.id,
      productNameDe: variant.product.nameDe,
      productNameEn: variant.product.nameEn,
      variantNameDe: variant.nameDe,
      variantNameEn: variant.nameEn,
      imageUrl: resolveProductMediaUrl(variant.product.media[0] ?? { objectKey: variant.product.imageKey }),
      unitPriceRappen,
      quantity,
      lineSubtotalRappen: unitPriceRappen * quantity,
      choices: variant.optionValues.map(({ optionValue }) => ({
        id: null,
        nameDe: `${optionValue.option.name}: ${optionValue.value}`,
        nameEn: `${optionValue.option.name}: ${optionValue.value}`,
        priceDeltaRappen: 0,
      })),
    };
  });

  const subtotalRappen = items.reduce((sum, item) => sum + item.lineSubtotalRappen, 0);
  const delivery = input.fulfillmentType === "DELIVERY"
    ? await getDeliveryQuote(input.postcode ?? "", subtotalRappen, db)
    : null;
  if (delivery && !delivery.eligible) throw new OrderError("DELIVERY_MINIMUM_NOT_MET");
  const promo = await findPromo(db, input.promoCode, input.customerEmail, userId);
  const discountRappen = promoDiscount(subtotalRappen, promo);
  const deliveryFeeRappen = delivery?.deliveryFeeRappen ?? 0;
  return {
    items,
    subtotalRappen,
    discountRappen,
    deliveryFeeRappen,
    totalRappen: Math.max(0, subtotalRappen - discountRappen) + deliveryFeeRappen,
    estimatedMinutes: null,
    promo,
    delivery,
  };
}

type EmailContent = { subject: string; text: string; html: string };

async function sendOrderNotification(orderId: bigint, kind: string, email: string, message: EmailContent) {
  const deduplicationKey = `order:${orderId}:${kind}:email`;
  const delivery = await prisma.notificationDelivery.upsert({
    where: { deduplicationKey },
    create: { orderId, channel: "EMAIL", kind, recipient: email, deduplicationKey },
    update: {},
  });
  if (delivery.status === "SENT") return;
  try {
    const result = await sendEmail({ to: email, ...message });
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENT", attemptCount: { increment: 1 }, providerId: result?.id, sentAt: new Date(), lastError: null },
    });
  } catch (error) {
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", attemptCount: { increment: 1 }, lastError: error instanceof Error ? error.message : "Email failed" },
    });
  }
}

function createdOrderDto(order: { id: bigint; status: OrderStatus; totalRappen: number }, trackingToken: string) {
  return { orderNumber: formatOrderNumber(order.id), status: order.status, totalRappen: order.totalRappen, trackingToken };
}

type StripeOrder = Prisma.OrderGetPayload<{ include: { payment: true } }>;

function stripeOrderId(session: Stripe.Checkout.Session) {
  const value = session.metadata?.orderId;
  if (!value || !/^\d+$/.test(value)) throw new OrderError("STRIPE_EVENT_INVALID");
  return BigInt(value);
}

function assertStripeSession(order: StripeOrder, session: Stripe.Checkout.Session) {
  if (
    order.payment?.provider !== "STRIPE"
    || order.payment.stripeCheckoutSessionId !== session.id
    || session.currency !== siteConfig.currency.toLowerCase()
    || session.amount_total !== order.payment.amountRappen
    || session.metadata?.orderNumber !== formatOrderNumber(order.id)
  ) throw new OrderError("STRIPE_EVENT_INVALID");
}

async function failPendingOrder(orderId: bigint, reason = "PAYMENT_SESSION_FAILED", session?: Stripe.Checkout.Session) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { payment: true, items: { select: { variantId: true, quantity: true } } } });
    if (session) assertStripeSession(order, session);
    if (order.status !== "PAYMENT_PENDING") return;
    const now = new Date();
    const cancellation = await tx.order.updateMany({
      where: { id: orderId, status: "PAYMENT_PENDING" },
      data: { status: "CANCELLED", version: { increment: 1 }, cancelledAt: now, cancellationReason: reason },
    });
    if (cancellation.count !== 1) return;
    await tx.payment.update({ where: { orderId }, data: { status: "FAILED", failedAt: now } });
    await tx.orderStatusEvent.create({
      data: { orderId, fromStatus: "PAYMENT_PENDING", toStatus: "CANCELLED", reason },
    });
    for (const item of order.items) {
      if (!item.variantId) continue;
      const released = await tx.$executeRaw`UPDATE productvariant SET stockReserved = stockReserved - ${item.quantity}, updatedAt = NOW(3) WHERE id = ${item.variantId} AND stockReserved >= ${item.quantity}`;
      if (released !== 1) throw new OrderError("INVENTORY_RESERVATION_INVALID");
      await tx.inventoryMovement.create({
        data: { variantId: item.variantId, orderId, type: "ORDER_RELEASED", quantityChange: item.quantity, reason, idempotencyKey: `order:${orderId}:${item.variantId}:release` },
      });
    }
  });
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

async function claimStripeEvent(event: Stripe.Event) {
  const replayAfter = new Date(Date.now() - 5 * 60 * 1000);
  const replay = await prisma.stripeWebhookEvent.updateMany({
    where: {
      eventId: event.id,
      OR: [{ status: "FAILED" }, { status: "PROCESSING", updatedAt: { lt: replayAfter } }],
    },
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

async function finalizePaidStripeSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") throw new OrderError("STRIPE_EVENT_INVALID");
  return prisma.$transaction(async (tx) => {
    const orderId = stripeOrderId(session);
    const current = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payment: true, items: { include: { variant: { select: { trackInventory: true } } } } },
    });
    assertStripeSession(current, session);
    if (current.status !== "PAYMENT_PENDING") {
      if (current.payment?.status !== "PAID") throw new OrderError("STRIPE_EVENT_INVALID");
      return null;
    }
    const now = new Date();
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!paymentIntentId) throw new OrderError("STRIPE_EVENT_INVALID");
    const payment = await tx.payment.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "PAID", stripePaymentIntentId: paymentIntentId, paidAt: now },
    });
    if (payment.count !== 1) throw new OrderError("STRIPE_EVENT_INVALID");
    for (const item of current.items) {
      if (!item.variantId || !item.variant?.trackInventory) continue;
      const consumed = await tx.$executeRaw`UPDATE productvariant SET stockOnHand = stockOnHand - ${item.quantity}, stockReserved = stockReserved - ${item.quantity}, updatedAt = NOW(3) WHERE id = ${item.variantId} AND stockOnHand >= ${item.quantity} AND stockReserved >= ${item.quantity}`;
      if (consumed !== 1) throw new OrderError("INVENTORY_RESERVATION_INVALID");
      await tx.inventoryMovement.create({
        data: { variantId: item.variantId, orderId, type: "ORDER_SOLD", quantityChange: -item.quantity, reason: "Stripe payment confirmed", idempotencyKey: `order:${orderId}:${item.variantId}:sell` },
      });
    }
    await tx.orderStatusEvent.create({
      data: { orderId, fromStatus: "PAYMENT_PENDING", toStatus: "CONFIRMED", reason: "STRIPE_PAID" },
    });
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
    } else if (event.type === "checkout.session.async_payment_succeeded") {
      confirmedOrder = await finalizePaidStripeSession(event.data.object);
    } else if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      await failPendingOrder(stripeOrderId(session), "STRIPE_PAYMENT_FAILED", session);
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      await failPendingOrder(stripeOrderId(session), "PAYMENT_SESSION_EXPIRED", session);
    } else if (event.type === "refund.created" || event.type === "refund.updated" || event.type === "refund.failed") {
      await syncStripeRefund(event.data.object);
    }
    await prisma.stripeWebhookEvent.update({
      where: { eventId: event.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
  } catch (error) {
    await prisma.stripeWebhookEvent.update({
      where: { eventId: event.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message : "Webhook failed" },
    });
    throw error;
  }

  if (confirmedOrder) {
    try {
      await sendOrderNotification(
        confirmedOrder.id,
        "confirmed",
        confirmedOrder.customerEmail,
        orderConfirmationEmail({ orderNumber: formatOrderNumber(confirmedOrder.id) }),
      );
    } catch {
      // Payment is authoritative; notification delivery must not make Stripe retry a processed event.
    }
  }
}

const orderInclude = {
  items: { include: { options: true, product: { select: { imageKey: true } } } },
  address: true,
  payment: true,
  statusEvents: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.OrderInclude;

type OrderActivity =
  | { id: string; kind: "ORDER_STATUS"; status: OrderStatus; at: string; reason: string | null }
  | { id: string; kind: "CASH_PAYMENT_CONFIRMED"; paymentStatus: "PAID"; at: string };

function orderDto(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
  const activities: OrderActivity[] = order.statusEvents.map((event) => ({
    id: event.id,
    kind: "ORDER_STATUS",
    status: event.toStatus,
    at: event.createdAt.toISOString(),
    reason: event.reason,
  }));
  if (order.payment?.provider === "CASH" && order.payment.paidAt) {
    activities.push({
      id: `cash-paid-${order.payment.id}`,
      kind: "CASH_PAYMENT_CONFIRMED",
      paymentStatus: "PAID",
      at: order.payment.paidAt.toISOString(),
    });
  }
  activities.sort((a, b) => b.at.localeCompare(a.at));

  return {
    orderNumber: formatOrderNumber(order.id),
    locale: order.locale.toLowerCase(),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    fulfillmentType: order.fulfillmentType,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.payment?.status,
    note: order.note,
    subtotalRappen: order.subtotalRappen,
    discountRappen: order.discountRappen,
    deliveryFeeRappen: order.deliveryFeeRappen,
    totalRappen: order.totalRappen,
    version: order.version,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    activityAt: activities[0]?.at ?? order.createdAt.toISOString(),
    activities,
    address: publicOrderAddress(order.address),
    items: order.items.map((item) => ({
      id: item.id,
      name: order.locale === "DE" ? item.productNameDeSnapshot : item.productNameEnSnapshot,
      variant: order.locale === "DE" ? item.variantNameDeSnapshot : item.variantNameEnSnapshot,
      unitPriceRappen: item.unitPriceRappen,
      quantity: item.quantity,
      lineSubtotalRappen: item.lineSubtotalRappen,
      imageUrl: resolvePublicImageUrl(item.product?.imageKey),
      options: item.options.map((option) => order.locale === "DE" ? option.nameDeSnapshot : option.nameEnSnapshot),
    })),
    timeline: order.statusEvents.map((event) => ({ status: event.toStatus, at: event.createdAt.toISOString() })),
  };
}

export async function getTrackedOrder(orderNumber: string, userId?: string, token?: string) {
  const id = parseOrderNumber(orderNumber);
  if (!id) return null;
  let order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order || (order.userId !== userId && (!token || order.guestTrackingTokenHash !== hashToken(token)))) return null;
  if (order.status === "PAYMENT_PENDING" && order.payment?.provider === "STRIPE" && order.payment.stripeCheckoutSessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(order.payment.stripeCheckoutSessionId);
      if (session.payment_status === "paid") {
        const confirmedOrder = await finalizePaidStripeSession(session);
        order = await prisma.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
        if (confirmedOrder) {
          await sendOrderNotification(confirmedOrder.id, "confirmed", confirmedOrder.customerEmail, orderConfirmationEmail({ orderNumber }));
        }
      }
    } catch (error) {
      console.error("Stripe checkout reconciliation failed", { orderNumber, error });
    }
  }
  return orderDto(order);
}

export async function getCustomerOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: orderInclude,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 50,
  });
  return orders.map(orderDto);
}

export async function getAdminOrders() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PAYMENT_PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
  return orders.map((order) => ({ ...orderDto(order), allowedNextStatus: nextOrderStatus(order.status, order.fulfillmentType) }));
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
  const product = await prisma.product.update({ where: { id: productId }, data: { available } });
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action: available ? "PRODUCT_AVAILABLE" : "PRODUCT_SOLD_OUT",
      entityType: "Product",
      entityId: product.id,
    },
  });
  return { id: product.id, available: product.available };
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
