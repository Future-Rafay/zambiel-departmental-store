import { createHash, randomBytes } from "node:crypto";

import { getEmailEnv } from "@/config/env";
import { prisma } from "@/server/db";
import { sendEmail } from "@/server/email/client";
import { newsletterWelcomeEmail } from "@/server/email/templates";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function subscribeNewsletter(email: string, locale: "de" | "en", deliver: typeof sendEmail = sendEmail) {
  const token = randomBytes(32).toString("base64url");
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email, locale: locale.toUpperCase() as "DE" | "EN", unsubscribeTokenHash: hashToken(token) },
    update: { locale: locale.toUpperCase() as "DE" | "EN", unsubscribeTokenHash: hashToken(token), subscribedAt: new Date(), unsubscribedAt: null },
  });
  const unsubscribeUrl = `${getEmailEnv().APP_URL}/${locale}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  await deliver({ to: email, ...newsletterWelcomeEmail({ locale, unsubscribeUrl }) });
}

export async function unsubscribeNewsletter(token: string) {
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { unsubscribeTokenHash: hashToken(token) }, select: { id: true, unsubscribedAt: true } });
  if (!subscriber) return false;
  if (!subscriber.unsubscribedAt) await prisma.newsletterSubscriber.update({ where: { id: subscriber.id }, data: { unsubscribedAt: new Date() } });
  return true;
}
