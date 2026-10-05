import {
  loginStaffMobile,
  staffMobileLoginSchema,
} from "@/server/auth/staff-mobile";
import { apiError } from "@/server/http";
import {
  consumePublicRateLimit,
  getForwardedClientIp,
  rateLimitedResponse,
} from "@/server/public-rate-limit";

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const clientIp = getForwardedClientIp(request.headers);
    if (clientIp) {
      const limit = await consumePublicRateLimit({
        scope: "staff-login-ip",
        identifier: clientIp,
        limit: 10,
        windowMs: 15 * 60_000,
      });
      if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);
    }

    const credentials = staffMobileLoginSchema.parse(input);
    const emailLimit = await consumePublicRateLimit({
      scope: "staff-login-email",
      identifier: credentials.email,
      limit: 8,
      windowMs: 15 * 60_000,
    });
    if (!emailLimit.allowed) {
      return rateLimitedResponse(emailLimit.retryAfterSeconds);
    }

    return Response.json(await loginStaffMobile(credentials));
  } catch (error) {
    return apiError(error);
  }
}
