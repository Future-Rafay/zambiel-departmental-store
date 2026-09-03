import { ZodError } from "zod";

import { assertSameOrigin } from "@/server/http";
import { consumePublicRateLimit, getForwardedClientIp, pruneExpiredPublicRateLimits } from "@/server/public-rate-limit";
import { subscribeNewsletter } from "@/server/services/newsletter";
import { newsletterSchema } from "@/server/validators/newsletter";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await pruneExpiredPublicRateLimits();
    const ip = getForwardedClientIp(request.headers);
    if (ip && !(await consumePublicRateLimit({ scope: "newsletter-ip", identifier: ip, limit: 10, windowMs: 15 * 60_000 })).allowed) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
    const input = newsletterSchema.parse(await request.json());
    if (!(await consumePublicRateLimit({ scope: "newsletter-email", identifier: input.email, limit: 3, windowMs: 60 * 60_000 })).allowed) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
    await subscribeNewsletter(input.email, input.locale);
    return Response.json({ subscribed: true });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
    if (error instanceof Error && error.message === "INVALID_ORIGIN") return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
    console.warn("Newsletter subscription failed:", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "SUBSCRIPTION_FAILED" }, { status: 502 });
  }
}
