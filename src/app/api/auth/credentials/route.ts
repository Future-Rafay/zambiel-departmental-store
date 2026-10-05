import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getEmailEnv } from "@/config/env";
import {
  createCredentialsSession,
  credentialsSchema,
} from "@/server/auth/credentials";
import { getSessionCookie } from "@/server/auth/session-cookie";
import {
  consumePublicRateLimit,
  getForwardedClientIp,
  rateLimitedResponse,
} from "@/server/public-rate-limit";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(getEmailEnv().APP_URL).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const input = await request.json();
    const clientIp = getForwardedClientIp(request.headers);
    if (clientIp) {
      const limit = await consumePublicRateLimit({
        scope: "web-login-ip",
        identifier: clientIp,
        limit: 10,
        windowMs: 15 * 60_000,
      });
      if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);
    }

    const credentials = credentialsSchema.parse(input);
    const emailLimit = await consumePublicRateLimit({
      scope: "web-login-email",
      identifier: credentials.email,
      limit: 8,
      windowMs: 15 * 60_000,
    });
    if (!emailLimit.allowed) {
      return rateLimitedResponse(emailLimit.retryAfterSeconds);
    }

    const result = await createCredentialsSession(credentials);
    if (!result) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const sessionCookie = getSessionCookie();
    const cookieStore = await cookies();
    cookieStore.set(sessionCookie.name, result.sessionToken, {
      ...sessionCookie.options,
      expires: result.expires,
    });

    return NextResponse.json({ user: result.user });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    }

    throw error;
  }
}
