import { createHash, randomBytes } from "node:crypto";

import { compare, hash } from "bcryptjs";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import { getAuthEnv } from "@/config/env";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/current-user";

const SESSION_DAYS = 30;
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const email = z.string().trim().email().transform((value) => value.toLowerCase());
export const mobileCredentialsSchema = z.object({ email, password: z.string().min(1).max(200) });
export const mobileRegistrationSchema = z.object({ name: z.string().trim().min(2).max(160), email, password: z.string().min(10).max(200) });
export const googleLoginSchema = z.object({ idToken: z.string().min(20) });

export class CustomerMobileAuthError extends Error {
  constructor(public code: "EMAIL_IN_USE" | "INVALID_CREDENTIALS" | "TOKEN_REQUIRED" | "TOKEN_INVALID" | "FORBIDDEN" | "GOOGLE_ACCOUNT_NOT_LINKED") { super(code); }
}

function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function publicUser(user: { id: string; email: string; name: string | null; phone: string | null }) { return user; }

async function issueSession(user: { id: string; email: string; name: string | null; phone: string | null }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.$transaction([
    prisma.customerMobileSession.create({ data: { userId: user.id, tokenHash: tokenHash(token), expiresAt } }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  ]);
  return { token, expiresAt: expiresAt.toISOString(), user: publicUser(user) };
}

export async function registerMobileCustomer(input: unknown) {
  const value = mobileRegistrationSchema.parse(input);
  if (await prisma.user.findUnique({ where: { email: value.email }, select: { id: true } })) throw new CustomerMobileAuthError("EMAIL_IN_USE");
  let user;
  try { user = await prisma.user.create({ data: { email: value.email, name: value.name, passwordHash: await hash(value.password, 12), role: "CUSTOMER" }, select: { id: true, email: true, name: true, phone: true } }); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new CustomerMobileAuthError("EMAIL_IN_USE"); throw error; }
  return issueSession(user);
}

export async function loginMobileCustomer(input: unknown) {
  const value = mobileCredentialsSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: value.email }, select: { id: true, email: true, name: true, phone: true, passwordHash: true, role: true, active: true } });
  if (!user?.active || !["CUSTOMER", "OWNER"].includes(user.role) || !user.passwordHash || !(await compare(value.password, user.passwordHash))) throw new CustomerMobileAuthError("INVALID_CREDENTIALS");
  return issueSession(user);
}

export async function loginMobileCustomerWithGoogle(input: unknown) {
  const { idToken } = googleLoginSchema.parse(input);
  let payload;
  try { ({ payload } = await jwtVerify(idToken, googleKeys, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: getAuthEnv().GOOGLE_CLIENT_ID })); }
  catch { throw new CustomerMobileAuthError("INVALID_CREDENTIALS"); }
  const providerAccountId = typeof payload.sub === "string" ? payload.sub : null;
  const googleEmail = typeof payload.email === "string" ? email.safeParse(payload.email).data : null;
  if (!providerAccountId || !googleEmail || payload.email_verified !== true) throw new CustomerMobileAuthError("INVALID_CREDENTIALS");
  const account = await prisma.account.findUnique({ where: { provider_providerAccountId: { provider: "google", providerAccountId } }, include: { user: { select: { id: true, email: true, name: true, phone: true, role: true, active: true } } } });
  if (account) {
    if (!account.user.active || !["CUSTOMER", "OWNER"].includes(account.user.role)) throw new CustomerMobileAuthError("GOOGLE_ACCOUNT_NOT_LINKED");
    return issueSession(account.user);
  }
  if (await prisma.user.findUnique({ where: { email: googleEmail }, select: { id: true } })) throw new CustomerMobileAuthError("GOOGLE_ACCOUNT_NOT_LINKED");
  const user = await prisma.user.create({ data: {
    email: googleEmail,
    name: typeof payload.name === "string" ? payload.name.slice(0, 160) : null,
    role: "CUSTOMER",
    accounts: { create: { type: "oidc", provider: "google", providerAccountId } },
  }, select: { id: true, email: true, name: true, phone: true } });
  return issueSession(user);
}

function bearer(request: Request) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

export async function getCustomerApiUser(request: Request) {
  const token = bearer(request);
  if (!token) return getCurrentUser();
  const session = await prisma.customerMobileSession.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: { select: { id: true, email: true, name: true, phone: true, role: true, active: true } } } });
  if (!session || session.expiresAt <= new Date() || !session.user.active || !["CUSTOMER", "OWNER"].includes(session.user.role)) return null;
  return session.user;
}

export async function requireCustomerApiUser(request: Request) {
  const user = await getCustomerApiUser(request);
  if (!user) throw new CustomerMobileAuthError("TOKEN_REQUIRED");
  return user;
}

export async function logoutMobileCustomer(request: Request) {
  const token = bearer(request);
  if (!token) throw new CustomerMobileAuthError("TOKEN_REQUIRED");
  await prisma.$transaction(async (tx) => {
    const session = await tx.customerMobileSession.findUnique({ where: { tokenHash: tokenHash(token) }, select: { userId: true } });
    if (!session) return;
    await tx.customerPushSubscription.deleteMany({ where: { userId: session.userId } });
    await tx.customerMobileSession.delete({ where: { tokenHash: tokenHash(token) } });
  });
}
