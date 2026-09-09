import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getEmailEnv } from "@/config/env";
import { StaffMobileAuthError } from "@/server/auth/staff-mobile-token";
import { CustomerMobileAuthError } from "@/server/auth/customer-mobile";
import { AdminError } from "@/server/services/admin";
import { OrderError } from "@/server/services/ordering";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(getEmailEnv().APP_URL).origin) throw new OrderError("INVALID_ORIGIN");
}

export function apiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_INPUT", details: error.issues }, { status: 400 });
  if (error instanceof OrderError) {
    const status = error.code === "INVALID_ORIGIN" ? 403 : error.code.endsWith("NOT_FOUND") ? 404 : error.code === "ORDER_CHANGED" ? 409 : 400;
    return NextResponse.json({ error: error.code }, { status });
  }
  if (error instanceof AdminError) return NextResponse.json({ error: error.code }, { status: error.code === "ORDER_NOT_FOUND" ? 404 : 400 });
  if (error instanceof StaffMobileAuthError) {
    const status = error.code === "FORBIDDEN" ? 403 : ["TOKEN_REQUIRED", "TOKEN_INVALID", "TOKEN_EXPIRED"].includes(error.code) ? 401 : 400;
    return NextResponse.json({ error: error.code }, { status });
  }
  if (error instanceof CustomerMobileAuthError) {
    const status = error.code === "EMAIL_IN_USE" ? 409 : error.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: error.code }, { status });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  throw error;
}
