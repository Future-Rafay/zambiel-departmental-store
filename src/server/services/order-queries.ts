import { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import { formatOrderNumber, hashToken, nextOrderStatus, parseOrderNumber, publicOrderAddress } from "@/lib/orders";
import { prisma } from "@/server/db";
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
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order || (order.userId !== userId && (!token || order.guestTrackingTokenHash !== hashToken(token)))) return null;
  return orderDto(order);
}

export async function getCustomerOrders(userId: string) {
  const orders = await prisma.order.findMany({ where: { userId }, include: orderInclude, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 50 });
  return orders.map(orderDto);
}

export async function getCustomerOrdersPage(userId: string, page = 1) {
  const take = 20;
  const safePage = Math.max(1, page);
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where: { userId }, include: orderInclude, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (safePage - 1) * take, take }),
    prisma.order.count({ where: { userId } }),
  ]);
  return { orders: orders.map(orderDto), page: safePage, pageCount: Math.max(1, Math.ceil(total / take)), total };
}

export async function getReorderCart(orderNumber: string, userId: string) {
  const id = parseOrderNumber(orderNumber);
  if (!id) return null;
  const order = await prisma.order.findFirst({ where: { id, userId }, select: { items: { select: { variantId: true, quantity: true, unitPriceRappen: true } } } });
  if (!order) return null;
  const variantIds = order.items.flatMap(({ variantId }) => variantId ? [variantId] : []);
  const variants = await prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, productId: true, nameDe: true, nameEn: true, priceRappen: true, active: true, deletedAt: true, trackInventory: true, stockOnHand: true, stockReserved: true, product: { select: { slug: true, nameDe: true, nameEn: true, imageKey: true, active: true, available: true, deletedAt: true, status: true } } } });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  return order.items.map((item) => {
    const variant = item.variantId ? byId.get(item.variantId) : null;
    const stock = variant?.trackInventory ? Math.max(0, variant.stockOnHand - variant.stockReserved) : null;
    const available = Boolean(variant?.active && !variant.deletedAt && variant.product.active && variant.product.available && !variant.product.deletedAt && variant.product.status === "ACTIVE" && (stock === null || stock > 0));
    return { variantId: item.variantId, productId: variant?.productId ?? null, slug: variant?.product.slug ?? null, nameDe: variant?.product.nameDe ?? null, nameEn: variant?.product.nameEn ?? null, variantDe: variant?.nameDe ?? null, variantEn: variant?.nameEn ?? null, imageUrl: resolvePublicImageUrl(variant?.product.imageKey), requestedQuantity: item.quantity, quantity: available ? Math.min(item.quantity, stock ?? item.quantity) : 0, previousPriceRappen: item.unitPriceRappen, currentPriceRappen: variant?.priceRappen ?? null, priceChanged: variant ? variant.priceRappen !== item.unitPriceRappen : null, available };
  });
}

export async function getAdminOrders() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PAYMENT_PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } },
    include: orderInclude, orderBy: { createdAt: "desc" },
  });
  return orders.map((order) => ({ ...orderDto(order), allowedNextStatus: nextOrderStatus(order.status, order.fulfillmentType) }));
}
