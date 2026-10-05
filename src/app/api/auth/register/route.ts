import { cookies } from "next/headers";
import { ZodError } from "zod";

import { createCredentialsSession } from "@/server/auth/credentials";
import {
  registerCustomer,
  registerCustomerSchema,
} from "@/server/auth/customer";
import { getSessionCookie } from "@/server/auth/session-cookie";
import { assertSameOrigin } from "@/server/http";
import {
  consumePublicRateLimit,
  getForwardedClientIp,
  rateLimitedResponse,
} from "@/server/public-rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const clientIp = getForwardedClientIp(request.headers);
    if (clientIp) {
      const limit = await consumePublicRateLimit({
        scope: "web-register-ip",
        identifier: clientIp,
        limit: 5,
        windowMs: 60 * 60_000,
      });
      if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);
    }

    const input = registerCustomerSchema.parse(await request.json());
    await registerCustomer(input);
    const session = await createCredentialsSession(input);
    if (!session) throw new Error("SESSION_FAILED");
    (await cookies()).set(getSessionCookie().name, session.sessionToken, { ...getSessionCookie().options, expires: session.expires });
    return Response.json({ user: session.user }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
    if (error instanceof Error && error.message === "EMAIL_IN_USE") return Response.json({ error: "EMAIL_IN_USE" }, { status: 409 });
    throw error;
  }
}
