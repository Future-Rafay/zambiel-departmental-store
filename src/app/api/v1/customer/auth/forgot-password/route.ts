import { ZodError } from "zod";
import { forgotPasswordSchema, requestPasswordReset } from "@/server/auth/password-reset";
import { consumePublicRateLimit, getForwardedClientIp, pruneExpiredPublicRateLimits } from "@/server/public-rate-limit";

export async function POST(request: Request) {
  try {
    await pruneExpiredPublicRateLimits();
    const ip = getForwardedClientIp(request.headers);
    if (ip && !(await consumePublicRateLimit({ scope: "mobile-password-reset-ip", identifier: ip, limit: 8, windowMs: 15 * 60_000 })).allowed) return Response.json({ accepted: true });
    const input = forgotPasswordSchema.parse(await request.json());
    if ((await consumePublicRateLimit({ scope: "mobile-password-reset-email", identifier: input.email, limit: 3, windowMs: 60 * 60_000 })).allowed) await requestPasswordReset(input);
    return Response.json({ accepted: true });
  } catch (error) {
    if (!(error instanceof ZodError)) console.warn("Mobile password reset request failed:", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ accepted: true });
  }
}
