import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";

test("bulk campaign sends one email per eligible customer in batches, then retries failures idempotently", async (context) => {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl || testDatabaseUrl === process.env.DATABASE_URL) {
    context.skip("TEST_DATABASE_URL must point to a migrated isolated database.");
    return;
  }
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DATABASE_CONNECTION_LIMIT = "1";
  process.env.DATABASE_SSL ??= "false";
  // The dev-only contact override is rejected outside NODE_ENV=development and is irrelevant here.
  delete process.env.CONTACT_EMAIL_TO_DEV;
  const [{ prisma }, marketing] = await Promise.all([import("@/server/db"), import("@/server/services/marketing-campaigns")]);
  const run = crypto.randomUUID().slice(0, 8);
  const emails = Array.from({ length: 150 }, (_, index) => `delivered+mkt-${run}-${String(index).padStart(3, "0")}@resend.dev`);
  const actor = await prisma.user.create({ data: { email: `mkt-owner-${run}@example.com`, role: "OWNER" } });
  try {
    await prisma.user.createMany({ data: emails.map((email, index) => ({ email, name: index % 10 ? `Customer ${index}` : null, role: "CUSTOMER" as const })) });
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
    const optedOut = users[0];
    await prisma.user.update({ where: { id: optedOut.id }, data: { marketingOptOutAt: new Date() } });

    const batches: Array<{ key: string; to: string[]; scheduledAt: Array<string | undefined>; html: string[] }> = [];
    let failNext = true;
    const deliver = async (messages: Array<{ to: string; html: string; scheduledAt?: string }>, key: string) => {
      batches.push({ key, to: messages.map((message) => message.to), scheduledAt: messages.map((message) => message.scheduledAt), html: messages.map((message) => message.html) });
      if (messages.length < 100 && failNext) { failNext = false; throw new Error("PROVIDER_DOWN"); }
      return messages.map(() => crypto.randomUUID());
    };

    const campaignId = await marketing.saveCampaignDraft({ name: `Test ${run}`, subject: "Hello {{first_name}}", locale: "EN", html: "<p>Dear {{name}}</p>" }, actor.id);
    const counts = await marketing.dispatchCampaign({ campaignId, userIds: [...users.map((user) => user.id), actor.id], sendAt: null, actorId: actor.id }, deliver);

    assert.deepEqual(counts, { SENT: 100, FAILED: 49 });
    assert.deepEqual(batches.map((batch) => batch.to.length), [100, 49]);
    assert.ok(batches.every((batch) => batch.to.every((to) => !to.includes(",")) && !batch.to.includes(optedOut.email) && !batch.to.includes(actor.email)));
    assert.equal(new Set(batches.flatMap((batch) => batch.to)).size, 149);
    const sentHtml = batches.flatMap((batch) => batch.html);
    assert.ok(sentHtml.some((html) => html.includes("Dear Customer 1<")) && sentHtml.some((html) => html.includes("Dear customer<")));
    await assert.rejects(() => marketing.dispatchCampaign({ campaignId, userIds: users.map((user) => user.id), sendAt: null, actorId: actor.id }, deliver), /CAMPAIGN_NOT_DRAFT/);

    const sentRow = await prisma.marketingCampaignRecipient.findFirstOrThrow({ where: { campaignId, status: "SENT" }, select: { id: true } });
    await assert.rejects(() => marketing.excludeCampaignRecipient({ campaignId, recipientId: sentRow.id, actorId: actor.id }), /RECIPIENT_NOT_EXCLUDABLE/);
    const failedRows = await prisma.marketingCampaignRecipient.findMany({ where: { campaignId, status: "FAILED" }, orderBy: { id: "asc" }, select: { id: true, email: true } });
    await marketing.excludeCampaignRecipient({ campaignId, recipientId: failedRows[0].id, actorId: actor.id });
    const retried = await marketing.retryFailedRecipients(campaignId, actor.id, deliver);
    assert.deepEqual(retried, { SENT: 148, CANCELLED: 1 });
    assert.ok(!batches[2].to.includes(failedRows[0].email), "an excluded recipient is not retried");

    const draftId = await marketing.saveCampaignDraft({ name: `Draft ${run}`, subject: "Draft", locale: "EN", html: "<p>Draft</p>" }, actor.id);
    await marketing.deleteCampaignDraft(draftId, actor.id);
    assert.equal(await prisma.marketingCampaign.count({ where: { id: draftId } }), 0);
    await assert.rejects(() => marketing.deleteCampaignDraft(campaignId, actor.id), /CAMPAIGN_NOT_DRAFT/, "sent campaigns keep their history");

    const scheduledId = await marketing.saveCampaignDraft({ name: `Scheduled ${run}`, subject: "Later", locale: "DE", html: "<p>Hallo {{name}}</p>" }, actor.id);
    const sendAt = new Date(Date.now() + 2 * 86_400_000);
    assert.deepEqual(await marketing.dispatchCampaign({ campaignId: scheduledId, userIds: users.slice(1, 11).map((user) => user.id), sendAt, actorId: actor.id }, deliver), { SCHEDULED: 10 });
    assert.ok(batches.at(-1)!.scheduledAt.every((value) => value === sendAt.toISOString()));
    const cancelled: string[] = [];
    assert.deepEqual(await marketing.cancelScheduledCampaign(scheduledId, actor.id, async (id) => { cancelled.push(id); }), { failed: 0 });
    assert.equal(cancelled.length, 10);
    assert.equal((await prisma.marketingCampaign.findUniqueOrThrow({ where: { id: scheduledId } })).status, "CANCELLED");

    const { marketingUnsubscribeToken } = await import("@/server/email/marketing");
    const { getRateLimitSecret } = await import("@/config/env");
    assert.equal(await marketing.unsubscribeMarketing(marketingUnsubscribeToken(users[1].id, getRateLimitSecret())), true);
    assert.equal(await marketing.unsubscribeMarketing(`${users[2].id}.forged`), false);
    const audience = (await marketing.listMarketingAudience({ sort: "asc", take: 1000 })).customers.map((customer) => customer.id);
    assert.ok(!audience.includes(users[1].id) && audience.includes(users[2].id));

    assert.throws(() => marketing.validateSendAt(new Date(Date.now() + 31 * 86_400_000)), /SCHEDULE_OUT_OF_RANGE/);
    assert.throws(() => marketing.validateSendAt(new Date(Date.now() + 60_000)), /SCHEDULE_OUT_OF_RANGE/);
  } finally {
    await prisma.marketingCampaign.deleteMany({ where: { name: { endsWith: run } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: actor.id } });
    await prisma.user.deleteMany({ where: { email: { in: [...emails, actor.email] } } });
    await prisma.$disconnect();
  }
});
