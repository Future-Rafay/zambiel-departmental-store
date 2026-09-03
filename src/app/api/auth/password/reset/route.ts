import { ZodError } from "zod";

import { resetPassword, resetPasswordSchema } from "@/server/auth/password-reset";
import { assertSameOrigin } from "@/server/http";
import { consumePublicRateLimit, getForwardedClientIp } from "@/server/public-rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = getForwardedClientIp(request.headers);
    if (ip && !(await consumePublicRateLimit({ scope: "password-reset-submit-ip", identifier: ip, limit: 10, windowMs: 15 * 60_000 })).allowed) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
    return Response.json(await resetPassword(resetPasswordSchema.parse(await request.json())));
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
    if (error instanceof Error && error.message === "INVALID_ORIGIN") return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
    if (error instanceof Error && error.message === "INVALID_OR_EXPIRED_RESET") return Response.json({ error: "INVALID_OR_EXPIRED_RESET" }, { status: 410 });
    return Response.json({ error: "RESET_FAILED" }, { status: 500 });
  }
}
