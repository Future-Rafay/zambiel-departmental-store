import { ZodError } from "zod";

import { EmailNotConfiguredError, sendEmail } from "@/server/email/client";
import {
  contactAcknowledgementEmail,
  contactInquiryEmail,
} from "@/server/email/templates";
import { assertSameOrigin } from "@/server/http";
import { consumePublicRateLimit, getForwardedClientIp, pruneExpiredPublicRateLimits } from "@/server/public-rate-limit";
import { getRuntimeStoreConfig } from "@/server/services/store-config";
import { contactSchema } from "@/server/validators/contact";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await pruneExpiredPublicRateLimits();
    const clientIp = getForwardedClientIp(request.headers);
    if (clientIp) {
      const limit = await consumePublicRateLimit({ scope: "ip", identifier: clientIp, limit: 5, windowMs: 15 * 60_000 });
      if (!limit.allowed) return rateLimited(limit.retryAfterSeconds);
    }
    const input = contactSchema.parse(await request.json());
    const emailLimit = await consumePublicRateLimit({ scope: "email", identifier: input.email, limit: 3, windowMs: 60 * 60_000 });
    if (!emailLimit.allowed) return rateLimited(emailLimit.retryAfterSeconds);
    const recipient = (await getRuntimeStoreConfig()).contact.email;
    if (!recipient) {
      return Response.json({ error: "CONTACT_UNAVAILABLE" }, { status: 503 });
    }

    await sendEmail({
      to: recipient,
      replyTo: input.email,
      ...contactInquiryEmail(input),
    });
    let acknowledgementSent = true;
    try {
      await sendEmail({ to: input.email, ...contactAcknowledgementEmail(input) });
    } catch (error) {
      acknowledgementSent = false;
      console.warn(
        "Contact inquiry delivered but acknowledgement failed:",
        error instanceof Error ? error.message : "Unknown email error",
      );
    }
    return Response.json({ sent: true, acknowledgementSent });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_ORIGIN") {
      return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
    }
    if (error instanceof EmailNotConfiguredError) {
      return Response.json({ error: "EMAIL_NOT_CONFIGURED" }, { status: 503 });
    }
    console.warn(
      "Contact email delivery failed:",
      error instanceof Error ? error.message : "Unknown email error",
    );
    return Response.json({ error: "EMAIL_DELIVERY_FAILED" }, { status: 502 });
  }
}

function rateLimited(retryAfterSeconds: number) {
  return Response.json(
    { error: "RATE_LIMITED", retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
