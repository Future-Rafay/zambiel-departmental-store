import { randomBytes } from "node:crypto";

import { compare } from "bcryptjs";
import { z } from "zod";

import type { UserRole } from "@/generated/prisma/enums";
import { getAuthEnv } from "@/config/env";
import { hashToken } from "@/lib/orders";
import { prisma } from "@/server/db";
import { accessTokenTtlSeconds, createStaffAccessToken, StaffMobileAuthError, verifyStaffAccessToken } from "@/server/auth/staff-mobile-token";

const refreshTokenTtlMs = 30 * 24 * 60 * 60 * 1000;

export const staffMobileLoginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
  deviceName: z.string().trim().min(1).max(160),
  platform: z.string().trim().min(1).max(40).default("android"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(32).max(500),
});

const pushTokenSchema = z.object({
  pushToken: z.string().trim().min(1).max(512).nullable(),
});

function publicUser(user: { id: string; email: string; name: string | null; role: UserRole }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function sessionResponse(user: { id: string; email: string; name: string | null; role: Extract<UserRole, "OWNER" | "STAFF"> }, sessionId: string, refreshToken: string) {
  return {
    accessToken: createStaffAccessToken({ sid: sessionId, sub: user.id, role: user.role }, getAuthEnv().AUTH_SECRET),
    accessTokenExpiresIn: accessTokenTtlSeconds,
    refreshToken,
    user: publicUser(user),
  };
}

export async function loginStaffMobile(
  input: z.input<typeof staffMobileLoginSchema>,
) {
  const values = staffMobileLoginSchema.parse(input);
  const user = await prisma.user.findUnique({
    where: { email: values.email },
    select: { id: true, email: true, name: true, role: true, active: true, passwordHash: true },
  });
  if (
    !user?.active ||
    !user.passwordHash ||
    !["OWNER", "STAFF"].includes(user.role) ||
    !(await compare(values.password, user.passwordHash))
  ) throw new StaffMobileAuthError("INVALID_CREDENTIALS");

  const refreshToken = randomBytes(48).toString("base64url");
  const session = await prisma.staffDeviceSession.create({
    data: {
      userId: user.id,
      deviceName: values.deviceName,
      platform: values.platform,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTokenTtlMs),
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return sessionResponse({ ...user, role: user.role as Extract<UserRole, "OWNER" | "STAFF"> }, session.id, refreshToken);
}

export async function refreshStaffMobile(input: z.input<typeof refreshSchema>) {
  const { refreshToken } = refreshSchema.parse(input);
  const session = await prisma.staffDeviceSession.findUnique({
    where: { refreshTokenHash: hashToken(refreshToken) },
    include: { user: { select: { id: true, email: true, name: true, role: true, active: true } } },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.user.active ||
    !["OWNER", "STAFF"].includes(session.user.role)
  ) throw new StaffMobileAuthError("REFRESH_TOKEN_INVALID");

  const nextRefreshToken = randomBytes(48).toString("base64url");
  await prisma.staffDeviceSession.update({
    where: { id: session.id },
    data: { refreshTokenHash: hashToken(nextRefreshToken), lastSeenAt: new Date() },
  });
  return sessionResponse(
    { ...session.user, role: session.user.role as Extract<UserRole, "OWNER" | "STAFF"> },
    session.id,
    nextRefreshToken,
  );
}

export async function requireStaffBearer(request: Request) {
  const header = request.headers.get("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new StaffMobileAuthError("TOKEN_REQUIRED");
  const payload = verifyStaffAccessToken(token, getAuthEnv().AUTH_SECRET);
  const session = await prisma.staffDeviceSession.findUnique({
    where: { id: payload.sid },
    include: { user: { select: { id: true, email: true, name: true, role: true, active: true } } },
  });
  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.user.active ||
    session.user.role !== payload.role
  ) throw new StaffMobileAuthError("TOKEN_INVALID");
  await prisma.staffDeviceSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  return { sessionId: session.id, user: publicUser(session.user) };
}

export async function logoutStaffMobile(input: z.input<typeof refreshSchema>) {
  const { refreshToken } = refreshSchema.parse(input);
  await prisma.staffDeviceSession.updateMany({
    where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { ok: true };
}

export async function updateCurrentDevicePushToken(request: Request, input: z.input<typeof pushTokenSchema>) {
  const auth = await requireStaffBearer(request);
  const { pushToken } = pushTokenSchema.parse(input);
  await prisma.staffDeviceSession.update({
    where: { id: auth.sessionId },
    data: { pushToken },
  });
  return { pushToken };
}
