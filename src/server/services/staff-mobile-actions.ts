import type { OrderStatus } from "@/generated/prisma/enums";
import { nextOrderStatus } from "@/lib/orders";

export function allowedOrderActions(order: {
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "PICKUP";
  payment?: { provider: "STRIPE" | "CASH"; status: string } | null;
}) {
  return {
    nextStatus: nextOrderStatus(order.status, order.fulfillmentType),
    canConfirmCash: order.payment?.provider === "CASH" && order.payment.status === "PENDING",
    canCancel:
      !["DELIVERED", "PICKED_UP", "CANCELLED"].includes(order.status) &&
      !(order.payment?.provider === "STRIPE" && ["PAID", "PARTIALLY_REFUNDED"].includes(order.payment.status)),
    canRefundAndCancel:
      !["DELIVERED", "PICKED_UP", "CANCELLED"].includes(order.status) &&
      order.payment?.provider === "STRIPE" && ["PAID", "PARTIALLY_REFUNDED"].includes(order.payment.status),
  };
}
