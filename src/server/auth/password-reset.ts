import { createHash, randomBytes } from "node:crypto";

import { hash } from "bcryptjs";
import { z } from "zod";

import { getEmailEnv } from "@/config/env";
import { prisma } from "@/server/db";
import { sendEmail } from "@/server/email/client";
import { passwordResetEmail } from "@/server/email/templates";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  locale: z.enum(["de", "en"]),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(10).max(200),
});

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function requestPasswordReset(input: z.infer<typeof forgotPasswordSchema>, deliver: typeof sendEmail = sendEmail) {
  const user = await prisma.user.findFirst({ where: { email: input.email, active: true, passwordHash: { not: null } }, select: { id: true } });
  if (!user) return false;
  const token = randomBytes(32).toString("base64url");
  const reset = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    return tx.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60_000) } });
  });
  try {
    const resetUrl = `${getEmailEnv().APP_URL}/${input.locale}/reset-password?token=${encodeURIComponent(token)}`;
    await deliver({ to: input.email, ...passwordResetEmail({ locale: input.locale, resetUrl }) });
    return true;
  } catch (error) {
    await prisma.passwordResetToken.delete({ where: { id: reset.id } }).catch(() => undefined);
    console.warn("Password reset email failed:", error instanceof Error ? error.message : "Unknown error");
    return false;
  }
}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  const passwordHash = await hash(input.password, 12);
  return prisma.$transaction(async (tx) => {
    const token = await tx.passwordResetToken.findUnique({ where: { tokenHash: hashToken(input.token) }, include: { user: { select: { active: true, role: true } } } });
    if (!token || token.usedAt || token.expiresAt <= new Date() || !token.user.active) throw new Error("INVALID_OR_EXPIRED_RESET");
    const claimed = await tx.passwordResetToken.updateMany({ where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw new Error("INVALID_OR_EXPIRED_RESET");
    await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: token.userId } });
    return { admin: token.user.role !== "CUSTOMER" };
  });
}
