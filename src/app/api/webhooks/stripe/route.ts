import type Stripe from "stripe";

import { getStripeEnv } from "@/config/env";
import { getStripe } from "@/server/payments/stripe";
import { processStripeEvent } from "@/server/services/ordering";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "MISSING_SIGNATURE" }, { status: 400 });
  const stripe = getStripe();
  const webhookSecret = getStripeEnv().STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return Response.json({ error: "INVALID_WEBHOOK" }, { status: 400 });
  }
  try {
    await processStripeEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook] processing failed", {
      eventType: event.type,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json({ error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
