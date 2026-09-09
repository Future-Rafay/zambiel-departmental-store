import { hashToken, parseOrderNumber } from "@/lib/orders";
import { prisma } from "@/server/db";
import { getStripe } from "@/server/payments/stripe";
import { OrderError } from "@/server/services/order-errors";

export async function resumeMobilePayment(orderNumber: string, userId?: string, trackingToken?: string) {
  const id = parseOrderNumber(orderNumber);
  const order = id ? await prisma.order.findUnique({ where: { id }, include: { payment: true } }) : null;
  if (!order || !((userId && order.userId === userId) || (trackingToken && order.guestTrackingTokenHash === hashToken(trackingToken)))) throw new OrderError("ORDER_NOT_FOUND");
  let checkoutUrl: string | null = null;
  if (order.status === "PAYMENT_PENDING" && order.payment?.provider === "STRIPE" && order.payment.stripeCheckoutSessionId) {
    const session = await getStripe().checkout.sessions.retrieve(order.payment.stripeCheckoutSessionId);
    // The signature-verified webhook alone changes payment and stock state.
    if (session.status === "open") checkoutUrl = session.url;
  }
  return { checkoutUrl, status: order.status, paymentStatus: order.payment?.status };
}
