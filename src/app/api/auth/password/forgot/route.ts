import { ZodError } from "zod";

import { forgotPasswordSchema, requestPasswordReset } from "@/server/auth/password-reset";
import { assertSameOrigin } from "@/server/http";
import { consumePublicRateLimit, getForwardedClientIp, pruneExpiredPublicRateLimits } from "@/server/public-rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await pruneExpiredPublicRateLimits();
    const ip = getForwardedClientIp(request.headers);
    if (ip && !(await consumePublicRateLimit({ scope: "password-reset-ip", identifier: ip, limit: 8, windowMs: 15 * 60_000 })).allowed) return Response.json({ accepted: true });
    const input = forgotPasswordSchema.parse(await request.json());
    const emailLimit = await consumePublicRateLimit({ scope: "password-reset-email", identifier: input.email, limit: 3, windowMs: 60 * 60_000 });
    if (emailLimit.allowed) await requestPasswordReset(input);
    return Response.json({ accepted: true });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
    if (error instanceof Error && error.message === "INVALID_ORIGIN") return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
    console.warn("Password reset request failed:", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ accepted: true });
  }
}
