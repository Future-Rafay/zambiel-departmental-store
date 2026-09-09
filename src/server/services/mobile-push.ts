import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { formatOrderNumber, hashToken, parseOrderNumber } from "@/lib/orders";
import { prisma } from "@/server/db";
import { OrderError } from "@/server/services/order-errors";

export const pushDeviceSchema = z.object({
  token: z.string().max(255).regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/),
  locale: z.enum(["de", "en"]).default("de"),
  orderNumber: z.string().max(80).optional(),
  trackingToken: z.uuid().optional(),
});

export function pushScopeKey(token: string, scope: string) {
  return `${scope}:${createHash("sha256").update(token).digest("hex")}`;
}

export function isPushDispatcherAuthorized(authorization: string | null, secret = process.env.MOBILE_PUSH_CRON_SECRET) {
  if (!secret || secret.length < 32 || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Persist alongside the status event: process exits cannot lose an order update.
export async function enqueueOrderPush(tx: Prisma.TransactionClient, orderId: bigint, status: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { userId: true } });
  const subscriptions = await tx.customerPushSubscription.findMany({ where: { OR: [{ orderId }, ...(order.userId ? [{ userId: order.userId }] : [])] } });
  const tokens = [...new Set(subscriptions.map((subscription) => subscription.token))];
  if (!tokens.length) return;
  await tx.notificationDelivery.createMany({ skipDuplicates: true, data: tokens.map((token) => ({
    orderId, channel: "PUSH" as const, kind: status, recipient: token,
    deduplicationKey: pushScopeKey(token, `push:${orderId}:${status}`), nextAttemptAt: new Date(),
  })) });
}

type PushResult = { status: "ok" | "error"; id?: string; details?: { error?: string } };
async function expoRequest(path: "send" | "getReceipts", payload: unknown) {
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`EXPO_HTTP_${response.status}`);
  return await response.json() as { data?: PushResult | Record<string, PushResult> };
}

export function pushRetryAt(attempt: number, now = Date.now()) {
  return new Date(now + Math.min(60 * 60_000, 30_000 * 2 ** attempt));
}

export async function savePushSubscription(input: z.input<typeof pushDeviceSchema>, userId?: string) {
  const value = pushDeviceSchema.parse(input);
  let orderId: bigint | undefined;
  if (!userId) {
    orderId = value.orderNumber ? parseOrderNumber(value.orderNumber) ?? undefined : undefined;
    if (!orderId || !value.trackingToken) throw new OrderError("ORDER_NOT_FOUND");
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { guestTrackingTokenHash: true } });
    if (!order?.guestTrackingTokenHash || order.guestTrackingTokenHash !== hashToken(value.trackingToken)) throw new OrderError("ORDER_NOT_FOUND");
  }
  const scopeKey = pushScopeKey(value.token, userId ? `user:${userId}` : `order:${orderId}`);
  await prisma.customerPushSubscription.upsert({
    where: { scopeKey },
    create: { token: value.token, scopeKey, userId, orderId, locale: value.locale.toUpperCase() as "DE" | "EN" },
    update: { locale: value.locale.toUpperCase() as "DE" | "EN" },
  });
}

export async function removePushSubscription(input: z.input<typeof pushDeviceSchema>, userId?: string) {
  const value = pushDeviceSchema.parse(input);
  const orderId = value.orderNumber ? parseOrderNumber(value.orderNumber) ?? undefined : undefined;
  if (!userId) {
    if (!orderId || !value.trackingToken) throw new OrderError("ORDER_NOT_FOUND");
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { guestTrackingTokenHash: true } });
    if (!order?.guestTrackingTokenHash || order.guestTrackingTokenHash !== hashToken(value.trackingToken)) throw new OrderError("ORDER_NOT_FOUND");
  }
  await prisma.customerPushSubscription.deleteMany({ where: {
    scopeKey: pushScopeKey(value.token, userId ? `user:${userId}` : `order:${orderId}`),
  } });
}

export async function dispatchMobilePush() {
  const now = new Date();
  const jobs = await prisma.notificationDelivery.findMany({ where: { channel: "PUSH", status: { in: ["PENDING", "FAILED"] }, attemptCount: { lt: 5 }, nextAttemptAt: { lte: now } }, orderBy: { createdAt: "asc" }, take: 30 });
  let accepted = 0;
  // ponytail: bounded sequential sends; batch at higher notification volume.
  for (const job of jobs) {
    const attemptCount = job.attemptCount + 1;
    const claimed = await prisma.notificationDelivery.updateMany({ where: { id: job.id, attemptCount: job.attemptCount, nextAttemptAt: { lte: now } }, data: { status: "PENDING", attemptCount, nextAttemptAt: new Date(Date.now() + 5 * 60_000) } });
    if (!claimed.count) continue;
    const subscription = job.orderId ? await prisma.customerPushSubscription.findFirst({ where: { token: job.recipient, OR: [{ orderId: job.orderId }, { user: { orders: { some: { id: job.orderId } }, active: true } }] } }) : null;
    if (!subscription || !job.orderId) {
      await prisma.notificationDelivery.update({ where: { id: job.id }, data: { status: "FAILED", nextAttemptAt: null, lastError: "SUBSCRIPTION_REMOVED" } });
      continue;
    }
    try {
      const result = await expoRequest("send", { to: job.recipient, sound: "default", channelId: "orders", title: subscription.locale === "DE" ? "Bestellung aktualisiert" : "Order updated", body: subscription.locale === "DE" ? "Öffne Zambiel, um den Bestellstatus zu sehen." : "Open Zambiel to see your order status.", data: { orderNumber: formatOrderNumber(job.orderId) } });
      const ticket = result.data as PushResult | undefined;
      if (ticket?.status !== "ok" || !ticket.id) {
        if (ticket?.details?.error === "DeviceNotRegistered") await prisma.customerPushSubscription.deleteMany({ where: { token: job.recipient } });
        throw new Error(ticket?.details?.error ?? "EXPO_INVALID_TICKET");
      }
      await prisma.notificationDelivery.update({ where: { id: job.id }, data: { status: "SENT", providerId: ticket.id, sentAt: new Date(), lastError: null, nextAttemptAt: new Date(Date.now() + 15 * 60_000) } });
      accepted++;
    } catch (error) {
      await prisma.notificationDelivery.update({ where: { id: job.id }, data: { status: "FAILED", lastError: error instanceof Error ? error.message.slice(0, 120) : "EXPO_FAILED", nextAttemptAt: attemptCount < 5 ? pushRetryAt(attemptCount) : null } });
    }
  }
  const receipts = await prisma.notificationDelivery.findMany({ where: { channel: "PUSH", status: "SENT", receiptCheckedAt: null, providerId: { not: null }, nextAttemptAt: { lte: now } }, take: 100 });
  if (receipts.length) {
    const result = await expoRequest("getReceipts", { ids: receipts.map((job) => job.providerId!) });
    const data = result.data as Record<string, PushResult> | undefined;
    for (const job of receipts) {
      const receipt = data?.[job.providerId!];
      if (!receipt) {
        const expired = job.sentAt && Date.now() - job.sentAt.getTime() > 24 * 60 * 60_000;
        await prisma.notificationDelivery.update({ where: { id: job.id }, data: expired ? { receiptCheckedAt: new Date(), lastError: "EXPO_RECEIPT_MISSING", nextAttemptAt: null } : { nextAttemptAt: new Date(Date.now() + 15 * 60_000) } });
        continue;
      }
      if (receipt.details?.error === "DeviceNotRegistered") await prisma.customerPushSubscription.deleteMany({ where: { token: job.recipient } });
      await prisma.notificationDelivery.update({ where: { id: job.id }, data: { receiptCheckedAt: new Date(), nextAttemptAt: null, lastError: receipt.status === "error" ? receipt.details?.error ?? "EXPO_RECEIPT_FAILED" : null } });
    }
  }
  return { examined: jobs.length, accepted, receipts: receipts.length };
}
