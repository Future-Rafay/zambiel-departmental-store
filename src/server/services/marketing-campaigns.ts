import { createHash } from "node:crypto";

import { getEmailEnv, getRateLimitSecret } from "@/config/env";
import { Prisma, type MarketingRecipientStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { cancelScheduledEmail, sendEmail, sendEmailBatch, type BatchEmailMessage } from "@/server/email/client";
import { applyMergeFields, domainAcceptsMail, htmlToText, isUndeliverableEmail, marketingUnsubscribeToken, verifyMarketingUnsubscribeToken, type MergeRecipient } from "@/server/email/marketing";
import { marketingEmail } from "@/server/email/templates";

export const MARKETING_BATCH_SIZE = 100;
export const MARKETING_MAX_SCHEDULE_DAYS = 30;
const STALE_SENDING_MS = 10 * 60_000;

// Registered, active customers who have not opted out or requested account deletion.
const audienceWhere = { role: "CUSTOMER", active: true, marketingOptOutAt: null, deletionRequest: { is: null } } satisfies Prisma.UserWhereInput;

type CampaignContent = { subject: string; html: string; locale: "DE" | "EN" };
type DeliverBatch = (messages: BatchEmailMessage[], idempotencyKey: string) => Promise<string[]>;

export async function listMarketingAudience(input: { sort: "asc" | "desc"; take: number }) {
  const [customers, total] = await Promise.all([
    prisma.user.findMany({ where: audienceWhere, select: { id: true, name: true, email: true }, orderBy: [{ name: { sort: input.sort, nulls: "last" } }, { email: input.sort }], take: input.take }),
    prisma.user.count({ where: audienceWhere }),
  ]);
  return { customers, total };
}

export function renderCampaignEmail(campaign: CampaignContent, recipient: MergeRecipient & { userId: string }) {
  const locale = campaign.locale === "EN" ? "en" : "de";
  const { APP_URL } = getEmailEnv();
  const token = encodeURIComponent(marketingUnsubscribeToken(recipient.userId, getRateLimitSecret()));
  const unsubscribeUrl = `${APP_URL}/${locale}/marketing/unsubscribe?token=${token}`;
  const subject = applyMergeFields(campaign.subject, recipient, locale, false);
  const body = applyMergeFields(campaign.html, recipient, locale, true);
  return {
    to: recipient.email,
    subject,
    html: marketingEmail({ locale, subject, bodyHtml: body, unsubscribeUrl }),
    text: `${htmlToText(body)}\n\n${locale === "de" ? "Abmelden" : "Unsubscribe"}: ${unsubscribeUrl}`,
    // RFC 8058 one-click unsubscribe, required by Gmail/Yahoo for bulk senders.
    headers: { "List-Unsubscribe": `<${APP_URL}/api/v1/public/marketing/unsubscribe?token=${token}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

export async function saveCampaignDraft(input: { id?: string; name: string; subject: string; locale: "DE" | "EN"; html: string }, actorId: string) {
  const data = { name: input.name, subject: input.subject, locale: input.locale, html: input.html };
  if (!input.id) {
    const campaign = await prisma.marketingCampaign.create({ data, select: { id: true } });
    await prisma.auditLog.create({ data: { actorUserId: actorId, action: "MARKETING_CAMPAIGN_CREATED", entityType: "MarketingCampaign", entityId: campaign.id } });
    return campaign.id;
  }
  const updated = await prisma.marketingCampaign.updateMany({ where: { id: input.id, status: "DRAFT" }, data });
  if (!updated.count) throw new Error("CAMPAIGN_NOT_DRAFT");
  return input.id;
}

// Drafts have no recipients or delivery history; sent campaigns are kept as records.
export async function deleteCampaignDraft(id: string, actorId: string) {
  const deleted = await prisma.marketingCampaign.deleteMany({ where: { id, status: "DRAFT" } });
  if (!deleted.count) throw new Error("CAMPAIGN_NOT_DRAFT");
  await prisma.auditLog.create({ data: { actorUserId: actorId, action: "MARKETING_CAMPAIGN_DELETED", entityType: "MarketingCampaign", entityId: id } });
}

// Takes a failed address out of the campaign so "Retry failed" stops sending it.
export async function excludeCampaignRecipient(input: { campaignId: string; recipientId: string; actorId: string }) {
  const excluded = await prisma.marketingCampaignRecipient.updateMany({ where: { id: input.recipientId, campaignId: input.campaignId, status: "FAILED" }, data: { status: "CANCELLED", error: "EXCLUDED_BY_OWNER" } });
  if (!excluded.count) throw new Error("RECIPIENT_NOT_EXCLUDABLE");
  await prisma.auditLog.create({ data: { actorUserId: input.actorId, action: "MARKETING_RECIPIENT_EXCLUDED", entityType: "MarketingCampaign", entityId: input.campaignId, metadata: { recipientId: input.recipientId } } });
}

export async function duplicateCampaign(id: string, actorId: string) {
  const source = await prisma.marketingCampaign.findUniqueOrThrow({ where: { id }, select: { name: true, subject: true, locale: true, html: true } });
  return saveCampaignDraft({ ...source, name: `${source.name} (copy)`.slice(0, 160) }, actorId);
}

export function validateSendAt(sendAt: Date | null, now = new Date()) {
  if (!sendAt) return;
  const ahead = sendAt.getTime() - now.getTime();
  if (Number.isNaN(ahead) || ahead < 5 * 60_000 || ahead > MARKETING_MAX_SCHEDULE_DAYS * 86_400_000) throw new Error("SCHEDULE_OUT_OF_RANGE");
}

export async function dispatchCampaign(input: { campaignId: string; userIds: string[]; sendAt: Date | null; actorId: string }, deliver: DeliverBatch = sendEmailBatch) {
  validateSendAt(input.sendAt);
  const users = await prisma.user.findMany({ where: { ...audienceWhere, id: { in: input.userIds } }, select: { id: true, name: true, email: true } });
  if (!users.length) throw new Error("NO_RECIPIENTS");
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.marketingCampaign.updateMany({ where: { id: input.campaignId, status: "DRAFT" }, data: { status: "SENDING", scheduledAt: input.sendAt } });
    if (!claimed.count) throw new Error("CAMPAIGN_NOT_DRAFT");
    await tx.marketingCampaignRecipient.createMany({ data: users.map((user) => ({ campaignId: input.campaignId, userId: user.id, email: user.email, name: user.name })), skipDuplicates: true });
    await tx.auditLog.create({ data: { actorUserId: input.actorId, action: input.sendAt ? "MARKETING_CAMPAIGN_SCHEDULED" : "MARKETING_CAMPAIGN_SENT", entityType: "MarketingCampaign", entityId: input.campaignId, metadata: { recipients: users.length, sendAt: input.sendAt?.toISOString() ?? null } } });
  });
  return deliverPendingRecipients(input.campaignId, deliver);
}

// shortcut: runs inside the admin request; each batch of 100 is 1 Resend call plus 100 row updates (several seconds against a remote DB); past a few thousand recipients it can hit the Vercel function timeout and the owner must press Resume. Move to a background job (cron/queue) when lists grow that large.
// Sends every PENDING recipient in batches of 100; each batch leaves PENDING, so a crash is resumable and a resend of the same batch reuses its idempotency key.
export async function deliverPendingRecipients(campaignId: string, deliver: DeliverBatch = sendEmailBatch) {
  const campaign = await prisma.marketingCampaign.findUniqueOrThrow({ where: { id: campaignId }, select: { subject: true, html: true, locale: true, scheduledAt: true } });
  const sendAt = campaign.scheduledAt && campaign.scheduledAt.getTime() > Date.now() + 60_000 ? campaign.scheduledAt : null;
  const domainChecks = new Map<string, Promise<boolean>>();
  const deliverable = (email: string) => {
    if (isUndeliverableEmail(email)) return Promise.resolve(false);
    const domain = email.split("@").pop()!.toLowerCase();
    if (!domainChecks.has(domain)) domainChecks.set(domain, domainAcceptsMail(domain));
    return domainChecks.get(domain)!;
  };
  for (;;) {
    const chunk = await prisma.marketingCampaignRecipient.findMany({ where: { campaignId, status: "PENDING" }, orderBy: { id: "asc" }, take: MARKETING_BATCH_SIZE, select: { id: true, userId: true, email: true, name: true } });
    if (!chunk.length) break;
    const removed = chunk.filter((recipient) => !recipient.userId).map((recipient) => recipient.id);
    if (removed.length) await prisma.marketingCampaignRecipient.updateMany({ where: { id: { in: removed } }, data: { status: "FAILED", error: "RECIPIENT_REMOVED" } });
    const checks = await Promise.all(chunk.map((recipient) => (recipient.userId ? deliverable(recipient.email) : false)));
    const undeliverable = chunk.filter((recipient, index) => recipient.userId && !checks[index]).map((recipient) => recipient.id);
    if (undeliverable.length) await prisma.marketingCampaignRecipient.updateMany({ where: { id: { in: undeliverable } }, data: { status: "FAILED", error: "UNDELIVERABLE_ADDRESS" } });
    const sendable = chunk.filter((recipient, index): recipient is typeof recipient & { userId: string } => Boolean(recipient.userId) && checks[index]);
    if (!sendable.length) continue;
    const ids = sendable.map((recipient) => recipient.id);
    const key = `marketing-${campaignId}-${createHash("sha256").update(`${sendAt?.toISOString() ?? "now"}|${ids.join(",")}`).digest("hex").slice(0, 32)}`;
    let providerIds: string[];
    try {
      const messages = sendable.map((recipient) => ({ ...renderCampaignEmail(campaign, recipient), ...(sendAt ? { scheduledAt: sendAt.toISOString() } : {}) }));
      providerIds = await deliver(messages, key);
    } catch (error) {
      await prisma.marketingCampaignRecipient.updateMany({ where: { id: { in: ids } }, data: { status: "FAILED", error: (error instanceof Error ? error.message : "SEND_FAILED").slice(0, 500) } });
      continue;
    }
    // One statement: 100 per-row updates outlast the transaction timeout against the remote DB. If this throws, the rows stay
    // PENDING (the emails were already accepted), so a resume reuses the same idempotency key instead of sending twice.
    const now = new Date();
    const providerIdCases = Prisma.join(sendable.map((recipient, index) => Prisma.sql`WHEN ${recipient.id} THEN ${providerIds[index] ?? null}`), " ");
    await prisma.$executeRaw`
      UPDATE marketingcampaignrecipient
      SET \`status\` = ${sendAt ? "SCHEDULED" : "SENT"}, \`providerMessageId\` = CASE \`id\` ${providerIdCases} END,
          \`sentAt\` = ${sendAt ?? now}, \`error\` = NULL, \`updatedAt\` = ${now}
      WHERE \`id\` IN (${Prisma.join(ids)})
    `;
  }
  await prisma.marketingCampaign.update({ where: { id: campaignId }, data: { status: sendAt ? "SCHEDULED" : "SENT", sentAt: sendAt ? null : new Date() } });
  return recipientCounts(campaignId);
}

export async function recipientCounts(campaignId: string) {
  const rows = await prisma.marketingCampaignRecipient.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } });
  return Object.fromEntries(rows.map((row) => [row.status, row._count._all])) as Partial<Record<MarketingRecipientStatus, number>>;
}

export async function retryFailedRecipients(campaignId: string, actorId: string, deliver: DeliverBatch = sendEmailBatch) {
  const campaign = await prisma.marketingCampaign.findUniqueOrThrow({ where: { id: campaignId }, select: { status: true, updatedAt: true } });
  const stale = campaign.status === "SENDING" && Date.now() - campaign.updatedAt.getTime() > STALE_SENDING_MS;
  if (!stale && campaign.status !== "SENT" && campaign.status !== "SCHEDULED") throw new Error("CAMPAIGN_NOT_RETRYABLE");
  // Optimistic claim: a concurrent retry sees a changed updatedAt and stops.
  const claimed = await prisma.marketingCampaign.updateMany({ where: { id: campaignId, status: campaign.status, updatedAt: campaign.updatedAt }, data: { status: "SENDING" } });
  if (!claimed.count) throw new Error("CAMPAIGN_NOT_RETRYABLE");
  await prisma.marketingCampaignRecipient.updateMany({ where: { campaignId, status: "FAILED", userId: { not: null } }, data: { status: "PENDING", error: null } });
  await prisma.auditLog.create({ data: { actorUserId: actorId, action: "MARKETING_CAMPAIGN_RETRIED", entityType: "MarketingCampaign", entityId: campaignId } });
  return deliverPendingRecipients(campaignId, deliver);
}

export async function cancelScheduledCampaign(campaignId: string, actorId: string, cancel: (id: string) => Promise<void> = cancelScheduledEmail) {
  const campaign = await prisma.marketingCampaign.findUniqueOrThrow({ where: { id: campaignId }, select: { status: true, scheduledAt: true } });
  if (campaign.status !== "SCHEDULED" || !campaign.scheduledAt || campaign.scheduledAt.getTime() <= Date.now() + 60_000) throw new Error("CAMPAIGN_NOT_CANCELLABLE");
  await prisma.marketingCampaignRecipient.updateMany({ where: { campaignId, status: { in: ["PENDING", "FAILED"] } }, data: { status: "CANCELLED" } });
  const scheduled = await prisma.marketingCampaignRecipient.findMany({ where: { campaignId, status: "SCHEDULED" }, select: { id: true, providerMessageId: true } });
  let failed = 0;
  for (const recipient of scheduled) {
    try {
      if (recipient.providerMessageId) await cancel(recipient.providerMessageId);
      await prisma.marketingCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "CANCELLED", error: null } });
    } catch (error) {
      failed += 1;
      await prisma.marketingCampaignRecipient.update({ where: { id: recipient.id }, data: { error: `CANCEL_FAILED: ${error instanceof Error ? error.message : "unknown"}`.slice(0, 500) } });
    }
  }
  if (!failed) await prisma.marketingCampaign.update({ where: { id: campaignId }, data: { status: "CANCELLED" } });
  await prisma.auditLog.create({ data: { actorUserId: actorId, action: "MARKETING_CAMPAIGN_CANCELLED", entityType: "MarketingCampaign", entityId: campaignId, metadata: { cancelled: scheduled.length - failed, failed } } });
  return { failed };
}

export async function sendCampaignTest(campaignId: string, actor: { id: string; email: string; name: string | null }, deliver: typeof sendEmail = sendEmail) {
  const campaign = await prisma.marketingCampaign.findUniqueOrThrow({ where: { id: campaignId }, select: { subject: true, html: true, locale: true } });
  const message = renderCampaignEmail(campaign, { userId: actor.id, email: actor.email, name: actor.name });
  await deliver({ ...message, subject: `[Test] ${message.subject}` });
}

export async function unsubscribeMarketing(token: string) {
  const userId = verifyMarketingUnsubscribeToken(token, getRateLimitSecret());
  if (!userId) return false;
  await prisma.user.updateMany({ where: { id: userId, marketingOptOutAt: null }, data: { marketingOptOutAt: new Date() } });
  return true;
}
