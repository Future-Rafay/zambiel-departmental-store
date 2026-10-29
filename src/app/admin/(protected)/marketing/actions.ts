"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { zurichDateToUtc } from "@/lib/zurich-time";
import { requireRole } from "@/server/auth/current-user";
import { EmailNotConfiguredError } from "@/server/email/client";
import { sanitizeMarketingHtml } from "@/server/email/marketing";
import { cancelScheduledCampaign, dispatchCampaign, duplicateCampaign, retryFailedRecipients, saveCampaignDraft, sendCampaignTest } from "@/server/services/marketing-campaigns";
import { getProductUploadPublicPrefix } from "@/server/storage/s3";

const knownErrors = new Set(["CAMPAIGN_NOT_DRAFT", "NO_RECIPIENTS", "SCHEDULE_OUT_OF_RANGE", "CAMPAIGN_NOT_RETRYABLE", "CAMPAIGN_NOT_CANCELLABLE", "INVALID_INPUT"]);
const errorCode = (error: unknown) => error instanceof EmailNotConfiguredError ? "EMAIL_NOT_CONFIGURED" : error instanceof z.ZodError ? "INVALID_INPUT" : error instanceof Error && knownErrors.has(error.message) ? error.message : null;

const campaignInput = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(200),
  locale: z.enum(["DE", "EN"]),
  html: z.string().max(500_000),
});

export async function saveMarketingCampaign(formData: FormData) {
  const actor = await requireRole("OWNER");
  const parsed = campaignInput.safeParse({ id: formData.get("id") || undefined, name: formData.get("name"), subject: formData.get("subject"), locale: formData.get("locale"), html: String(formData.get("html") ?? "") });
  const editingId = String(formData.get("id") ?? "");
  const back = editingId ? `/admin/marketing/${encodeURIComponent(editingId)}` : "/admin/marketing/new";
  if (!parsed.success) redirect(`${back}?error=INVALID_INPUT`);
  const html = sanitizeMarketingHtml(parsed.data.html, [getProductUploadPublicPrefix()]);
  if (!html) redirect(`${back}?error=EMAIL_BODY_REQUIRED`);
  let id: string;
  try {
    id = await saveCampaignDraft({ ...parsed.data, html }, actor.id);
  } catch (error) {
    const code = errorCode(error);
    if (!code) throw error;
    redirect(`${back}?error=${code}`);
  }
  revalidatePath("/admin/marketing");
  redirect(`/admin/marketing/${id}?saved=1`);
}

export async function duplicateMarketingCampaign(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = await duplicateCampaign(z.string().min(1).parse(formData.get("id")), actor.id);
  revalidatePath("/admin/marketing");
  redirect(`/admin/marketing/${id}?saved=1`);
}

export async function sendMarketingTest(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  let result = "test=sent";
  try {
    await sendCampaignTest(id, { id: actor.id, email: actor.email ?? "", name: actor.name ?? null });
  } catch (error) {
    console.error("Marketing test email failed", { campaignId: id, error });
    result = `error=${errorCode(error) ?? "TEST_SEND_FAILED"}`;
  }
  redirect(`/admin/marketing/${id}?${result}`);
}

const sendInput = z.object({
  id: z.string().min(1),
  userIds: z.array(z.string().min(1)).min(1).max(5_000),
  mode: z.enum(["now", "schedule"]),
  sendAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).optional(),
});

export async function sendMarketingCampaign(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  let result: string;
  try {
    const input = sendInput.parse({ id, userIds: formData.getAll("userId").map(String), mode: formData.get("mode"), sendAt: formData.get("sendAt") || undefined });
    const local = input.mode === "schedule" ? input.sendAt : undefined;
    if (input.mode === "schedule" && !local) throw new Error("SCHEDULE_OUT_OF_RANGE");
    const sendAt = local ? zurichDateToUtc(local.slice(0, 10), Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16))) : null;
    await dispatchCampaign({ campaignId: input.id, userIds: input.userIds, sendAt, actorId: actor.id });
    result = `done=${sendAt ? "scheduled" : "sent"}`;
  } catch (error) {
    const code = error instanceof z.ZodError && !formData.getAll("userId").length ? "NO_RECIPIENTS" : errorCode(error);
    if (!code) throw error;
    result = `error=${code}`;
  }
  revalidatePath("/admin/marketing");
  redirect(`/admin/marketing/${id}?${result}`);
}

export async function retryMarketingCampaign(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  let result = "done=retried";
  try {
    await retryFailedRecipients(id, actor.id);
  } catch (error) {
    const code = errorCode(error);
    if (!code) throw error;
    result = `error=${code}`;
  }
  revalidatePath("/admin/marketing");
  redirect(`/admin/marketing/${id}?${result}`);
}

export async function cancelMarketingCampaign(formData: FormData) {
  const actor = await requireRole("OWNER");
  const id = z.string().min(1).parse(formData.get("id"));
  let result = "done=cancelled";
  try {
    const { failed } = await cancelScheduledCampaign(id, actor.id);
    if (failed) result = "error=CANCEL_PARTIALLY_FAILED";
  } catch (error) {
    const code = errorCode(error);
    if (!code) throw error;
    result = `error=${code}`;
  }
  revalidatePath("/admin/marketing");
  redirect(`/admin/marketing/${id}?${result}`);
}
