import { Prisma } from "@/generated/prisma/client";
import type Stripe from "stripe";
import { formatOrderNumber, parseOrderNumber } from "@/lib/orders";
import { prisma } from "@/server/db";
import { orderStatusEmail } from "@/server/email/templates";
import { getStripe } from "@/server/payments/stripe";
import { sendOrderNotification } from "@/server/services/order-notifications";
import { enqueueOrderPush } from "@/server/services/mobile-push";

type Db = Prisma.TransactionClient | typeof prisma;

export class AdminError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

async function audit(db: Db, actorUserId: string, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
  await db.auditLog.create({ data: { actorUserId, action, entityType, entityId, metadata } });
}

export async function getSettingsAdminData() {
  const [site, fulfillment, zones] = await Promise.all([
    prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.fulfillmentSettings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.deliveryZone.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] }),
  ]);
  return { site, fulfillment, zones };
}

export async function getPromosAdminData() {
  return prisma.promoCode.findMany({ include: { _count: { select: { redemptions: true } } }, orderBy: { createdAt: "desc" } });
}

export async function getStaffAdminData() {
  const [staff, invitations] = await Promise.all([
    prisma.user.findMany({ where: { role: "STAFF" }, select: { id: true, email: true, name: true, active: true, lastLoginAt: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
    prisma.staffInvitation.findMany({ where: { acceptedAt: null }, select: { id: true, email: true, expiresAt: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return { staff, invitations };
}

const adminOrderInclude = {
  address: true,
  items: { include: { options: true } },
  payment: { include: { refunds: { include: { requestedBy: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" as const } } } },
  statusEvents: { include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" as const } },
  inventoryMovements: { include: { variant: { select: { nameEn: true, sku: true } } }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.OrderInclude;

function adminOrderDto(order: Prisma.OrderGetPayload<{ include: typeof adminOrderInclude }>) {
  return {
    ...order,
    id: order.id.toString(),
    orderNumber: formatOrderNumber(order.id),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    remainingRefundableRappen: order.payment?.provider === "STRIPE" ? Math.max(0, order.payment.amountRappen - order.payment.refundedRappen) : 0,
  };
}

export async function getOrderHistory(status?: string) {
  const allowed = ["PAYMENT_PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "PICKED_UP", "CANCELLED"] as const;
  const where: Prisma.OrderWhereInput = status === "UNPAID_B2B"
    ? { payment: { is: { provider: "INVOICE_BANK_TRANSFER", status: "PENDING_VERIFICATION" } } }
    : allowed.includes(status as typeof allowed[number])
      ? { status: status as typeof allowed[number] }
      : {};
  const orders = await prisma.order.findMany({ where, include: adminOrderInclude, orderBy: { createdAt: "desc" }, take: 200 });
  return orders.map(adminOrderDto);
}

export async function getAdminOrder(orderNumber: string) {
  const id = parseOrderNumber(orderNumber);
  if (!id) return null;
  const order = await prisma.order.findUnique({ where: { id }, include: adminOrderInclude });
  return order ? adminOrderDto(order) : null;
}

export async function getAuditLogs() {
  return prisma.auditLog.findMany({ include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 250 });
}

export async function getDashboardData() {
  const [payments, totalOrders, totalProducts, availableProducts, activeOrders, pendingStripe, recentRows, inventory] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } },
      _sum: { amountRappen: true, refundedRappen: true },
    }),
    prisma.order.count(),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null, active: true, available: true } }),
    prisma.order.count({ where: { status: { in: ["PAYMENT_PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } } }),
    prisma.payment.count({ where: { provider: "STRIPE", status: "PENDING", order: { status: "PAYMENT_PENDING" } } }),
    prisma.order.findMany({ include: adminOrderInclude, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.productVariant.findMany({ where: { active: true, deletedAt: null, trackInventory: true }, select: { stockOnHand: true, stockReserved: true, lowStockThreshold: true } }),
  ]);
  return {
    revenueRappen: Math.max(0, (payments._sum.amountRappen ?? 0) - (payments._sum.refundedRappen ?? 0)),
    totalOrders,
    totalProducts,
    availableProducts,
    unavailableProducts: totalProducts - availableProducts,
    activeOrders,
    pendingStripe,
    lowStock: inventory.filter((variant) => variant.stockOnHand - variant.stockReserved <= (variant.lowStockThreshold ?? 5)).length,
    recentOrders: recentRows.map(adminOrderDto),
  };
}

export async function saveCategory(actorId: string, data: Prisma.CategoryUncheckedCreateInput & { id?: string }) {
  const { id, ...values } = data;
  const row = id
    ? await prisma.category.update({ where: { id, deletedAt: null }, data: values })
    : await prisma.category.create({ data: values });
  await audit(prisma, actorId, id ? "CATEGORY_UPDATED" : "CATEGORY_CREATED", "Category", row.id);
  return row;
}

export async function saveZone(actorId: string, data: Prisma.DeliveryZoneUncheckedCreateInput & { id?: string }) {
  const { id, ...values } = data;
  const row = id ? await prisma.deliveryZone.update({ where: { id }, data: values }) : await prisma.deliveryZone.create({ data: values });
  await audit(prisma, actorId, id ? "DELIVERY_ZONE_UPDATED" : "DELIVERY_ZONE_CREATED", "DeliveryZone", row.id);
  return row;
}

export async function saveSiteSettings(actorId: string, data: Prisma.SiteSettingsUpdateInput) {
  const row = await prisma.siteSettings.update({ where: { id: 1 }, data });
  await audit(prisma, actorId, "SITE_SETTINGS_UPDATED", "SiteSettings", "1");
  return row;
}

export async function savePromo(actorId: string, data: Prisma.PromoCodeUncheckedCreateInput & { id?: string }) {
  const { id, ...values } = data;
  const row = id ? await prisma.promoCode.update({ where: { id }, data: values }) : await prisma.promoCode.create({ data: values });
  await audit(prisma, actorId, id ? "PROMO_UPDATED" : "PROMO_CREATED", "PromoCode", row.id);
  return row;
}

export async function setStaffActive(actorId: string, staffId: string, active: boolean) {
  const row = await prisma.user.update({ where: { id: staffId, role: "STAFF" }, data: { active } });
  if (!active) await prisma.session.deleteMany({ where: { userId: staffId } });
  await audit(prisma, actorId, active ? "STAFF_REACTIVATED" : "STAFF_DEACTIVATED", "User", row.id);
  return row;
}

export async function setCustomerB2bAccess(actorId: string, customerId: string, approved: boolean) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.user.findFirst({ where: { id: customerId, OR: [{ role: "CUSTOMER" }, { role: "OWNER", id: actorId }] }, select: { id: true, b2b_status: true, is_b2b_authorized: true } });
    if (!customer) throw new AdminError("CUSTOMER_NOT_FOUND");
    const status = approved ? "APPROVED" : "REJECTED";
    const authorized = approved;
    if (customer.b2b_status === status && customer.is_b2b_authorized === authorized) return customer;
    const updated = await tx.user.update({ where: { id: customer.id }, data: { b2b_status: status, is_b2b_authorized: authorized } });
    await audit(tx, actorId, approved ? "B2B_ACCESS_APPROVED" : "B2B_ACCESS_REJECTED", "User", customer.id, { previousStatus: customer.b2b_status });
    return updated;
  });
}

export async function confirmInvoicePayment(orderNumber: string, actorUserId: string) {
  const id = parseOrderNumber(orderNumber);
  if (!id) throw new AdminError("ORDER_NOT_FOUND");
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { orderId: id }, select: { provider: true, status: true } });
    if (!payment) throw new AdminError("ORDER_NOT_FOUND");
    if (payment.provider !== "INVOICE_BANK_TRANSFER" || payment.status !== "PENDING_VERIFICATION") throw new AdminError("PAYMENT_CONFIRMATION_NOT_ALLOWED");
    const now = new Date();
    const changed = await tx.payment.updateMany({ where: { orderId: id, provider: "INVOICE_BANK_TRANSFER", status: "PENDING_VERIFICATION" }, data: { status: "PAID", paidAt: now } });
    if (changed.count !== 1) throw new AdminError("PAYMENT_CONFIRMATION_NOT_ALLOWED");
    await tx.order.update({ where: { id }, data: { version: { increment: 1 }, updatedAt: now } });
    await audit(tx, actorUserId, "INVOICE_PAYMENT_CONFIRMED", "Order", id.toString());
    return { paymentStatus: "PAID" as const };
  });
}

// Undo exactly what the order's ledger shows it took, whatever trackInventory says now: sold stock returns to the shelf, an unpaid reservation is released.
async function restoreOrderInventory(tx: Prisma.TransactionClient, orderId: bigint, actorUserId: string | null, reason: string) {
  const movements = await tx.inventoryMovement.findMany({ where: { orderId, type: { in: ["ORDER_RESERVED", "ORDER_SOLD", "ORDER_RELEASED", "ORDER_RESTORED"] } }, select: { variantId: true, type: true, quantityChange: true } });
  const has = (variantId: string, type: string) => movements.some((movement) => movement.variantId === variantId && movement.type === type);
  const sold = movements.filter((movement) => movement.type === "ORDER_SOLD" && !has(movement.variantId, "ORDER_RESTORED"));
  const reserved = movements.filter((movement) => movement.type === "ORDER_RESERVED" && !has(movement.variantId, "ORDER_SOLD") && !has(movement.variantId, "ORDER_RELEASED"));
  const quantities = (rows: typeof movements) => Prisma.join(rows.map((row) => Prisma.sql`WHEN ${row.variantId} THEN ${-row.quantityChange}`), " ");
  const ids = (rows: typeof movements) => Prisma.join(rows.map((row) => row.variantId));
  if (sold.length) {
    const changed = await tx.$executeRaw`UPDATE productvariant SET stockOnHand = stockOnHand + CASE id ${quantities(sold)} END, updatedAt = NOW(3) WHERE id IN (${ids(sold)})`;
    if (changed !== sold.length) throw new AdminError("INVENTORY_RESTORE_FAILED");
  }
  if (reserved.length) {
    const changed = await tx.$executeRaw`UPDATE productvariant SET stockReserved = stockReserved - CASE id ${quantities(reserved)} END, updatedAt = NOW(3) WHERE id IN (${ids(reserved)}) AND stockReserved >= CASE id ${quantities(reserved)} END`;
    if (changed !== reserved.length) throw new AdminError("INVENTORY_RESTORE_FAILED");
  }
  const undo = (rows: typeof movements, type: "ORDER_RESTORED" | "ORDER_RELEASED", suffix: string) => rows.map((row) => ({ variantId: row.variantId, orderId, actorUserId, type, quantityChange: -row.quantityChange, reason, idempotencyKey: `order:${orderId}:${row.variantId}:${suffix}` }));
  await tx.inventoryMovement.createMany({ data: [...undo(sold, "ORDER_RESTORED", "restore"), ...undo(reserved, "ORDER_RELEASED", "release")] });
}

// One key per rendered form: a double submit hits the unique ledger key instead of adjusting twice.
export async function adjustVariantStock(actorId: string, input: { variantId: string; quantityChange: number; reason: string; adjustmentKey: string }) {
  const { variantId, quantityChange, reason, adjustmentKey } = input;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.inventoryMovement.create({ data: { variantId, type: "MANUAL_ADJUSTMENT", quantityChange, reason, actorUserId: actorId, idempotencyKey: `manual:${adjustmentKey}` } });
      // Open Stripe checkouts hold stockReserved; going below it would make their payment finalization fail.
      const changed = await tx.$executeRaw`UPDATE productvariant SET stockOnHand = stockOnHand + ${quantityChange}, updatedAt = NOW(3) WHERE id = ${variantId} AND (${quantityChange} > 0 OR stockOnHand + ${quantityChange} >= stockReserved)`;
      if (changed !== 1) throw new AdminError("INVENTORY_BELOW_RESERVED");
      await audit(tx, actorId, "INVENTORY_ADJUSTED", "ProductVariant", variantId, { quantityChange, reason });
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
}

export async function cancelOrder(actorId: string, orderNumber: string, reason: string) {
  const id = parseOrderNumber(orderNumber);
  if (!id) throw new AdminError("ORDER_NOT_FOUND");
  // Close an open Stripe Checkout first (outside the transaction) so the customer cannot pay a cancelled order.
  const pending = await prisma.payment.findUnique({ where: { orderId: id }, select: { provider: true, status: true, stripeCheckoutSessionId: true } });
  let sessionExpired = false;
  if (pending?.provider === "STRIPE" && pending.status === "PENDING" && pending.stripeCheckoutSessionId) {
    const session = await getStripe().checkout.sessions.retrieve(pending.stripeCheckoutSessionId);
    if (session.status === "complete") throw new AdminError("STRIPE_PAYMENT_IN_PROGRESS");
    if (session.status === "open") await getStripe().checkout.sessions.expire(session.id);
    sessionExpired = true;
  }
  const cancelled = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { payment: true } });
    if (!order) throw new AdminError("ORDER_NOT_FOUND");
    // The checkout.session.expired webhook can cancel the order before this transaction runs.
    if (sessionExpired && order.status === "CANCELLED") return undefined;
    if (["DELIVERED", "PICKED_UP", "CANCELLED"].includes(order.status)) throw new AdminError("CANCELLATION_NOT_ALLOWED");
    if (order.payment?.provider === "STRIPE" && ["PAID", "PARTIALLY_REFUNDED"].includes(order.payment.status)) throw new AdminError("OWNER_REFUND_REQUIRED");
    await tx.order.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason, version: { increment: 1 } } });
    await tx.orderStatusEvent.create({ data: { orderId: id, actorUserId: actorId, fromStatus: order.status, toStatus: "CANCELLED", reason } });
    await enqueueOrderPush(tx, id, "CANCELLED");
    await restoreOrderInventory(tx, id, actorId, reason);
    await audit(tx, actorId, "ORDER_CANCELLED", "Order", id.toString(), { reason });
    return { id: order.id, email: order.customerEmail, locale: order.locale };
  });
  await notifyCancellation(cancelled);
}

export async function refundOrder(actorId: string, input: { orderNumber: string; amountRappen: number; reason: string; refundKey: string; cancelOrder: boolean }) {
  const id = parseOrderNumber(input.orderNumber);
  if (!id) throw new AdminError("ORDER_NOT_FOUND");
  const [order, actor] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { payment: true } }),
    prisma.user.findFirst({ where: { id: actorId, active: true, role: { in: ["OWNER", "STAFF"] } }, select: { role: true } }),
  ]);
  const payment = order?.payment;
  if (!order || !payment || !actor) throw new AdminError("ORDER_NOT_FOUND");
  if (payment.provider !== "STRIPE" || !payment.stripePaymentIntentId || !["PAID", "PARTIALLY_REFUNDED"].includes(payment.status)) throw new AdminError("REFUND_NOT_ALLOWED");
  const remaining = payment.amountRappen - payment.refundedRappen;
  if (input.amountRappen > remaining || (input.cancelOrder && input.amountRappen !== remaining)) throw new AdminError("REFUND_AMOUNT_INVALID");
  if (actor.role === "STAFF" && (!input.cancelOrder || input.amountRappen !== remaining)) throw new AdminError("FULL_REFUND_REQUIRED");
  if (input.cancelOrder && ["DELIVERED", "PICKED_UP", "CANCELLED"].includes(order.status)) throw new AdminError("CANCELLATION_NOT_ALLOWED");

  const stripeRefund = await getStripe().refunds.create({ payment_intent: payment.stripePaymentIntentId, amount: input.amountRappen, metadata: { orderId: id.toString(), reason: input.reason, cancelOrder: String(input.cancelOrder), actorUserId: actorId } }, { idempotencyKey: input.refundKey });
  const refund = await prisma.$transaction(async (tx) => {
    const existing = await tx.refund.findUnique({ where: { stripeRefundId: stripeRefund.id } });
    if (existing) return existing;
    const failed = stripeRefund.status === "failed" || stripeRefund.status === "canceled";
    const created = await tx.refund.create({ data: { paymentId: payment.id, requestedByUserId: actorId, stripeRefundId: stripeRefund.id, amountRappen: input.amountRappen, reason: input.reason, status: failed ? "FAILED" : "PENDING", failureMessage: stripeRefund.failure_reason } });
    await audit(tx, actorId, "STRIPE_REFUND_REQUESTED", "Order", id.toString(), { amountRappen: input.amountRappen, reason: input.reason, stripeRefundId: stripeRefund.id });
    return created;
  }).catch((error) => {
    // The refund.created webhook can save the same refund first (see recoverUnsavedRefund).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return prisma.refund.findUniqueOrThrow({ where: { stripeRefundId: stripeRefund.id } });
    throw error;
  });
  if (stripeRefund.status === "succeeded") {
    await notifyCancellation(await settleSucceededRefund(stripeRefund.id, input.cancelOrder));
    return prisma.refund.findUniqueOrThrow({ where: { stripeRefundId: stripeRefund.id } });
  }
  return refund;
}

async function settleSucceededRefund(stripeRefundId: string, cancelOrder: boolean) {
  return prisma.$transaction(async (tx) => {
    // Claim first: the webhook and the admin request can settle the same refund at the same moment, and only one may count it.
    const claimed = await tx.refund.updateMany({ where: { stripeRefundId, status: "PENDING" }, data: { status: "SUCCEEDED", failureMessage: null } });
    if (claimed.count !== 1) return;
    const refund = await tx.refund.findUniqueOrThrow({ where: { stripeRefundId }, include: { payment: { include: { order: true } } } });
    const payment = refund.payment;
    const order = payment.order;
    const refundedRappen = Math.min(payment.amountRappen, payment.refundedRappen + refund.amountRappen);
    await tx.payment.update({ where: { id: payment.id }, data: { refundedRappen, status: refundedRappen === payment.amountRappen ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    await tx.auditLog.create({ data: { actorUserId: refund.requestedByUserId, action: "STRIPE_REFUND_SUCCEEDED", entityType: "Order", entityId: order.id.toString(), metadata: { amountRappen: refund.amountRappen, stripeRefundId } } });
    if (cancelOrder && refundedRappen === payment.amountRappen && !["DELIVERED", "PICKED_UP", "CANCELLED"].includes(order.status)) {
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: refund.reason, version: { increment: 1 } } });
      await tx.orderStatusEvent.create({ data: { orderId: order.id, actorUserId: refund.requestedByUserId, fromStatus: order.status, toStatus: "CANCELLED", reason: refund.reason } });
      await enqueueOrderPush(tx, order.id, "CANCELLED");
      await restoreOrderInventory(tx, order.id, refund.requestedByUserId, refund.reason);
      await tx.auditLog.create({ data: { actorUserId: refund.requestedByUserId, action: "ORDER_CANCELLED_AFTER_REFUND", entityType: "Order", entityId: order.id.toString(), metadata: { stripeRefundId } } });
      return { id: order.id, email: order.customerEmail, locale: order.locale };
    }
  });
}

async function notifyCancellation(order: { id: bigint; email: string; locale: "DE" | "EN" } | undefined) {
  if (!order) return;
  await sendOrderNotification(
    order.id,
    "status-cancelled",
    order.email,
    orderStatusEmail({ orderNumber: formatOrderNumber(order.id), status: "CANCELLED", locale: order.locale }),
  );
}

// refundOrder asks Stripe before it saves. If that save failed, rebuild the row from the metadata refundOrder sent with the refund.
// Refunds made in the Stripe dashboard carry no such metadata and stay unrecorded.
async function recoverUnsavedRefund(stripeRefund: Stripe.Refund) {
  const { orderId, reason, actorUserId } = stripeRefund.metadata ?? {};
  const paymentIntentId = typeof stripeRefund.payment_intent === "string" ? stripeRefund.payment_intent : stripeRefund.payment_intent?.id;
  if (!orderId || !/^\d{1,18}$/.test(orderId) || !paymentIntentId) return false;
  const [payment, actor] = await Promise.all([
    prisma.payment.findUnique({ where: { orderId: BigInt(orderId) }, select: { id: true, provider: true, stripePaymentIntentId: true } }),
    actorUserId ? prisma.user.findUnique({ where: { id: actorUserId }, select: { id: true } }) : null,
  ]);
  if (payment?.provider !== "STRIPE" || payment.stripePaymentIntentId !== paymentIntentId) return false;
  const data = { paymentId: payment.id, requestedByUserId: actor?.id, stripeRefundId: stripeRefund.id, amountRappen: stripeRefund.amount, reason: reason || "Stripe refund" };
  try {
    await prisma.$transaction([
      prisma.refund.create({ data }),
      prisma.auditLog.create({ data: { actorUserId: actor?.id, action: "STRIPE_REFUND_REQUESTED", entityType: "Order", entityId: orderId, metadata: { amountRappen: data.amountRappen, reason: data.reason, stripeRefundId: stripeRefund.id, recoveredFromWebhook: true } } }),
    ]);
  } catch (error) {
    // refundOrder saved it in the meantime.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
  return true;
}

export async function syncStripeRefund(stripeRefund: Stripe.Refund) {
  const existing = await prisma.refund.findUnique({ where: { stripeRefundId: stripeRefund.id }, select: { id: true, status: true } });
  if (!existing && !(await recoverUnsavedRefund(stripeRefund))) return;
  if (existing?.status === "SUCCEEDED") return;
  if (stripeRefund.status === "succeeded") {
    await notifyCancellation(await settleSucceededRefund(stripeRefund.id, stripeRefund.metadata?.cancelOrder === "true"));
    return;
  }
  const failed = stripeRefund.status === "failed" || stripeRefund.status === "canceled";
  await prisma.refund.update({ where: { stripeRefundId: stripeRefund.id }, data: { status: failed ? "FAILED" : "PENDING", failureMessage: stripeRefund.failure_reason } });
}

export async function refundAndCancelOrder(actorId: string, orderNumber: string, reason: string, refundKey: string) {
  const id = parseOrderNumber(orderNumber);
  if (!id) throw new AdminError("ORDER_NOT_FOUND");
  const payment = await prisma.payment.findUnique({ where: { orderId: id }, select: { amountRappen: true, refundedRappen: true } });
  if (!payment) throw new AdminError("ORDER_NOT_FOUND");
  return refundOrder(actorId, { orderNumber, reason, refundKey, cancelOrder: true, amountRappen: payment.amountRappen - payment.refundedRappen });
}
