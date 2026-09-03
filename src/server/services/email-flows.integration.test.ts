import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";

import { compare, hash } from "bcryptjs";

test("newsletter resubscription and password reset stay idempotent and single-use", async (context) => {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl || testDatabaseUrl === process.env.DATABASE_URL) {
    context.skip("TEST_DATABASE_URL must point to a migrated isolated database.");
    return;
  }
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DATABASE_CONNECTION_LIMIT = "1";
  process.env.DATABASE_SSL ??= "false";
  const [{ prisma }, newsletter, passwordReset] = await Promise.all([
    import("@/server/db"),
    import("@/server/services/newsletter"),
    import("@/server/auth/password-reset"),
  ]);
  const email = `email-flow-${crypto.randomUUID()}@example.com`;
  const messages: Array<{ text: string }> = [];
  const deliver = async (message: { text: string }) => { messages.push(message); return { id: crypto.randomUUID() }; };
  try {
    await newsletter.subscribeNewsletter(email, "en", deliver);
    await newsletter.subscribeNewsletter(email, "de", deliver);
    assert.equal(await prisma.newsletterSubscriber.count({ where: { email } }), 1);
    const unsubscribeUrl = messages.at(-1)!.text.match(/https?:\/\/\S+/)![0];
    assert.equal(await newsletter.unsubscribeNewsletter(new URL(unsubscribeUrl).searchParams.get("token")!), true);

    const user = await prisma.user.create({ data: { email, role: "CUSTOMER", passwordHash: await hash("old-password", 12) } });
    await prisma.session.create({ data: { sessionToken: crypto.randomUUID(), userId: user.id, expires: new Date(Date.now() + 60_000) } });
    assert.equal(await passwordReset.requestPasswordReset({ email, locale: "en" }, deliver), true);
    const resetUrl = messages.at(-1)!.text.match(/https?:\/\/\S+/)![0];
    const token = new URL(resetUrl).searchParams.get("token")!;
    assert.deepEqual(await passwordReset.resetPassword({ token, password: "new-password-123" }), { admin: false });
    assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
    assert.equal(await compare("new-password-123", (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash!), true);
    await assert.rejects(() => passwordReset.resetPassword({ token, password: "another-password" }), /INVALID_OR_EXPIRED_RESET/);
  } finally {
    await prisma.newsletterSubscriber.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
});
