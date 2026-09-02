import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { sendEmail } from "@/server/email/client";

type EmailContent = { subject: string; text: string; html: string };
type DeliverEmail = (message: EmailContent & { to: string }) => Promise<{ id?: string } | undefined>;

export async function sendOrderNotification(
  orderId: bigint,
  kind: string,
  email: string,
  message: EmailContent,
  deliver: DeliverEmail = sendEmail,
) {
  const deduplicationKey = `order:${orderId}:${kind}:email`;
  let deliveryId: string | undefined;
  let attemptCount: number | undefined;

  try {
    try {
      const delivery = await prisma.notificationDelivery.create({
        data: { orderId, channel: "EMAIL", kind, recipient: email, deduplicationKey, attemptCount: 1 },
      });
      deliveryId = delivery.id;
      attemptCount = 1;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const delivery = await prisma.notificationDelivery.findUniqueOrThrow({ where: { deduplicationKey } });
      if (delivery.status === "SENT") return false;
      const claimed = await prisma.notificationDelivery.updateMany({
        where: {
          id: delivery.id,
          attemptCount: delivery.attemptCount,
          OR: [{ status: "FAILED" }, { status: "PENDING", updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } }],
        },
        data: { status: "PENDING", attemptCount: { increment: 1 }, providerId: null, sentAt: null, lastError: null },
      });
      if (claimed.count !== 1) return false;
      deliveryId = delivery.id;
      attemptCount = delivery.attemptCount + 1;
    }

    const result = await deliver({ to: email, ...message });
    const markedSent = await prisma.notificationDelivery.updateMany({
      where: { id: deliveryId, status: "PENDING", attemptCount },
      data: { status: "SENT", providerId: result?.id, sentAt: new Date(), lastError: null },
    });
    return markedSent.count === 1;
  } catch (error) {
    if (deliveryId && attemptCount !== undefined) {
      await prisma.notificationDelivery.updateMany({
        where: { id: deliveryId, status: "PENDING", attemptCount },
        data: { status: "FAILED", lastError: error instanceof Error ? error.message : "Email failed" },
      }).catch(() => undefined);
    }
    console.error("Order notification delivery failed", { orderId: orderId.toString(), kind, error });
    return false;
  }
}
