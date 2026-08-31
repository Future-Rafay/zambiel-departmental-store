import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

import { formatOrderNumber, parseOrderNumber, publicOrderAddress } from "@/lib/orders";
import { prisma } from "@/server/db";
import { allowedOrderActions } from "@/server/services/staff-mobile-actions";
import { resolvePublicImageUrl } from "@/server/storage/s3";
import { staffOrderFilterSchema } from "@/server/validators/staff-mobile";

const activeStatuses: OrderStatus[] = ["PAYMENT_PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"];

const staffOrderSelect = {
  id: true,
  locale: true,
  status: true,
  version: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  fulfillmentType: true,
  paymentMethod: true,
  note: true,
  subtotalRappen: true,
  discountRappen: true,
  deliveryFeeRappen: true,
  taxRateBps: true,
  taxAmountRappen: true,
  totalRappen: true,
  deliveryZoneNameDeSnapshot: true,
  deliveryZoneNameEnSnapshot: true,
  completedAt: true,
  cancelledAt: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
  address: { select: { recipientName: true, phone: true, street: true, streetExtra: true, postalCode: true, city: true, countryCode: true } },
  payment: { select: { provider: true, status: true, amountRappen: true, refundedRappen: true, paidAt: true } },
  items: {
    select: {
      productNameDeSnapshot: true,
      productNameEnSnapshot: true,
      variantNameDeSnapshot: true,
      variantNameEnSnapshot: true,
      unitPriceRappen: true,
      quantity: true,
      lineSubtotalRappen: true,
      product: { select: { imageKey: true } },
      options: { select: { nameDeSnapshot: true, nameEnSnapshot: true, priceDeltaRappen: true } },
    },
  },
  statusEvents: {
    select: {
      fromStatus: true,
      toStatus: true,
      reason: true,
      note: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.OrderSelect;

type StaffOrderRow = Prisma.OrderGetPayload<{ select: typeof staffOrderSelect }>;

export function staffOrderDto(order: StaffOrderRow) {
  const payment = order.payment
    ? {
        provider: order.payment.provider,
        status: order.payment.status,
        amountRappen: order.payment.amountRappen,
        refundedRappen: order.payment.refundedRappen,
        paidAt: order.payment.paidAt?.toISOString() ?? null,
      }
    : null;

  return {
    orderNumber: formatOrderNumber(order.id),
    locale: order.locale,
    status: order.status,
    version: order.version,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    fulfillmentType: order.fulfillmentType,
    paymentMethod: order.paymentMethod,
    note: order.note,
    subtotalRappen: order.subtotalRappen,
    discountRappen: order.discountRappen,
    deliveryFeeRappen: order.deliveryFeeRappen,
    taxRateBps: order.taxRateBps,
    taxAmountRappen: order.taxAmountRappen,
    totalRappen: order.totalRappen,
    deliveryZoneNameDe: order.deliveryZoneNameDeSnapshot,
    deliveryZoneNameEn: order.deliveryZoneNameEnSnapshot,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    completedAt: order.completedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancellationReason: order.cancellationReason,
    address: publicOrderAddress(order.address),
    payment,
    remainingRefundableRappen: payment?.provider === "STRIPE" ? Math.max(0, payment.amountRappen - payment.refundedRappen) : 0,
    items: order.items.map((item) => ({
      productNameDe: item.productNameDeSnapshot,
      productNameEn: item.productNameEnSnapshot,
      variantNameDe: item.variantNameDeSnapshot,
      variantNameEn: item.variantNameEnSnapshot,
      unitPriceRappen: item.unitPriceRappen,
      quantity: item.quantity,
      lineSubtotalRappen: item.lineSubtotalRappen,
      imageUrl: resolvePublicImageUrl(item.product?.imageKey),
      options: item.options.map((option) => ({ nameDe: option.nameDeSnapshot, nameEn: option.nameEnSnapshot, priceDeltaRappen: option.priceDeltaRappen })),
    })),
    statusEvents: order.statusEvents.map((event) => ({
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      reason: event.reason,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
      actorName: event.actor?.name ?? null,
    })),
    allowedActions: allowedOrderActions({ status: order.status, fulfillmentType: order.fulfillmentType, payment }),
  };
}

export async function getStaffContext() {
  const [site, fulfillment] = await Promise.all([
    prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 }, select: { displayName: true, timezone: true, primaryColor: true, secondaryColor: true } }),
    prisma.fulfillmentSettings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  return {
    site,
    fulfillment: {
      deliveryEnabled: fulfillment.deliveryEnabled,
      pickupEnabled: fulfillment.pickupEnabled,
    },
    activeStatuses,
    pollSeconds: 10,
  };
}

export async function getStaffOrders(status?: string) {
  const parsedStatus = staffOrderFilterSchema.parse(status);
  const orders = await prisma.order.findMany({
    where: { status: parsedStatus ?? { in: activeStatuses } },
    select: staffOrderSelect,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: 200,
  });
  return orders.map(staffOrderDto);
}

export async function getStaffOrder(orderNumber: string) {
  const id = parseOrderNumber(orderNumber);
  if (!id) return null;
  const order = await prisma.order.findUnique({ where: { id }, select: staffOrderSelect });
  return order ? staffOrderDto(order) : null;
}
