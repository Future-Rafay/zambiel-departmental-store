import { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import { formatOrderNumber, hashToken, nextOrderStatus, parseOrderNumber, publicOrderAddress } from "@/lib/orders";
import { prisma } from "@/server/db";
import { orderConfirmationEmail } from "@/server/email/templates";
import { getStripe } from "@/server/payments/stripe";
import { sendOrderNotification } from "@/server/services/order-notifications";
import { finalizePaidStripeSession } from "@/server/services/order-stripe";
import { resolvePublicImageUrl } from "@/server/storage/s3";

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
  const activities: OrderActivity[] = order.statusEvents.map((event) => ({ id: event.id, kind: "ORDER_STATUS", status: event.toStatus, at: event.createdAt.toISOString(), reason: event.reason }));
  if (order.payment?.provider === "CASH" && order.payment.paidAt) activities.push({ id: `cash-paid-${order.payment.id}`, kind: "CASH_PAYMENT_CONFIRMED", paymentStatus: "PAID", at: order.payment.paidAt.toISOString() });
  activities.sort((a, b) => b.at.localeCompare(a.at));
  return {
    orderNumber: formatOrderNumber(order.id), locale: order.locale.toLowerCase(),
    customerName: order.customerName, customerEmail: order.customerEmail, customerPhone: order.customerPhone,
    fulfillmentType: order.fulfillmentType, status: order.status, paymentMethod: order.paymentMethod, paymentStatus: order.payment?.status,
    note: order.note, subtotalRappen: order.subtotalRappen, discountRappen: order.discountRappen,
    deliveryFeeRappen: order.deliveryFeeRappen, totalRappen: order.totalRappen, version: order.version,
    createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(), activityAt: activities[0]?.at ?? order.createdAt.toISOString(), activities,
    address: publicOrderAddress(order.address),
    items: order.items.map((item) => ({
      id: item.id, name: order.locale === "DE" ? item.productNameDeSnapshot : item.productNameEnSnapshot,
      variant: order.locale === "DE" ? item.variantNameDeSnapshot : item.variantNameEnSnapshot,
      unitPriceRappen: item.unitPriceRappen, quantity: item.quantity, lineSubtotalRappen: item.lineSubtotalRappen,
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
        if (confirmedOrder) await sendOrderNotification(confirmedOrder.id, "confirmed", confirmedOrder.customerEmail, orderConfirmationEmail({ orderNumber }));
      }
    } catch (error) {
      console.error("Stripe checkout reconciliation failed", { orderNumber, error });
    }
  }
  return orderDto(order);
}

export async function getCustomerOrders(userId: string) {
  const orders = await prisma.order.findMany({ where: { userId }, include: orderInclude, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 50 });
  return orders.map(orderDto);
}

export async function getAdminOrders() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PAYMENT_PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } },
    include: orderInclude, orderBy: { createdAt: "desc" },
  });
  return orders.map((order) => ({ ...orderDto(order), allowedNextStatus: nextOrderStatus(order.status, order.fulfillmentType) }));
}
