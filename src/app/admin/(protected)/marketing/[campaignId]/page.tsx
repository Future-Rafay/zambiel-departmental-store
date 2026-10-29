import Link from "next/link";
import { notFound } from "next/navigation";

import { duplicateMarketingCampaign, retryMarketingCampaign, sendMarketingTest } from "@/app/admin/(protected)/marketing/actions";
import { AdminPage, Notice } from "@/components/admin/admin-ui";
import { CancelCampaignDialog } from "@/components/admin/danger-actions";
import { MarketingCampaignForm } from "@/components/admin/marketing-campaign-form";
import { MarketingSendForm } from "@/components/admin/marketing-send-form";
import { CampaignStatusBadge } from "@/components/admin/marketing-status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatZurichDateTimeLocal } from "@/lib/zurich-time";
import { requireRole } from "@/server/auth/current-user";
import { prisma } from "@/server/db";
import { listMarketingAudience, MARKETING_MAX_SCHEDULE_DAYS, recipientCounts, renderCampaignEmail } from "@/server/services/marketing-campaigns";

const limits = [100, 200, 500] as const;
const doneMessages: Record<string, string> = { sent: "Campaign sent. Resend accepted the emails listed below.", scheduled: "Campaign scheduled. Resend will send it at the chosen time.", retried: "Failed emails were sent again.", cancelled: "Scheduled emails were cancelled." };

// Request-time clock reads live outside components to keep render pure.
function scheduleBounds(now = Date.now()) {
  return { minSendAt: formatZurichDateTimeLocal(new Date(now + 10 * 60_000)), maxSendAt: formatZurichDateTimeLocal(new Date(now + MARKETING_MAX_SCHEDULE_DAYS * 86_400_000 - 60_000)) };
}

function deliveryState(campaign: { status: string; scheduledAt: Date | null; updatedAt: Date }, now = Date.now()) {
  return {
    stale: campaign.status === "SENDING" && now - campaign.updatedAt.getTime() > 10 * 60_000,
    cancellable: campaign.status === "SCHEDULED" && Boolean(campaign.scheduledAt) && campaign.scheduledAt!.getTime() > now + 60_000,
  };
}

export default async function MarketingCampaignPage({ params, searchParams }: { params: Promise<{ campaignId: string }>; searchParams: Promise<{ saved?: string; error?: string; test?: string; done?: string; sort?: string; top?: string }> }) {
  const [{ campaignId }, query, actor] = await Promise.all([params, searchParams, requireRole("OWNER")]);
  const campaign = await prisma.marketingCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) notFound();
  const preview = renderCampaignEmail(campaign, { userId: actor.id, email: actor.email ?? "", name: actor.name ?? null });
  const draft = campaign.status === "DRAFT";

  return (
    <AdminPage title={campaign.name} description={campaign.subject} actions={<><CampaignStatusBadge status={campaign.status} scheduledAt={campaign.scheduledAt} /><Link href="/admin/marketing" className="inline-flex min-h-11 items-center px-3 text-sm font-bold text-primary">All campaigns</Link></>}>
      <Notice saved={query.saved} error={query.error} />
      {query.test === "sent" || (query.done && doneMessages[query.done]) ? <p role="status" className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">{query.test === "sent" ? `Test email sent to ${actor.email}.` : doneMessages[query.done!]}</p> : null}
      <div className="space-y-6">
        {draft ? <MarketingCampaignForm campaign={{ id: campaign.id, name: campaign.name, subject: campaign.subject, locale: campaign.locale, html: campaign.html }} /> : null}

        <Card className="border-border bg-surface p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">Preview</h2>
            <div className="flex flex-wrap gap-2">
              <form action={sendMarketingTest}><input type="hidden" name="id" value={campaign.id} /><Button type="submit" variant="outline" size="compact">Send test to me</Button></form>
              <form action={duplicateMarketingCampaign}><input type="hidden" name="id" value={campaign.id} /><Button type="submit" variant="outline" size="compact">Duplicate</Button></form>
            </div>
          </div>
          <p className="mb-3 text-xs text-muted">Shown with your own name in the personal fields. Subject: <strong>{preview.subject}</strong></p>
          <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="h-[640px] w-full rounded-lg border bg-white" />
        </Card>

        {draft ? <RecipientPicker campaignId={campaign.id} sort={query.sort === "desc" ? "desc" : "asc"} top={limits.find((limit) => String(limit) === query.top) ?? 100} /> : <DeliverySummary campaign={campaign} />}
      </div>
    </AdminPage>
  );
}

async function RecipientPicker({ campaignId, sort, top }: { campaignId: string; sort: "asc" | "desc"; top: number }) {
  const { customers, total } = await listMarketingAudience({ sort, take: top });
  const { minSendAt, maxSendAt } = scheduleBounds();
  return (
    <Card className="border-border bg-surface p-5">
      <h2 className="mb-1 font-display text-lg font-bold">2. Choose recipients</h2>
      <p className="mb-4 text-xs text-muted">Registered, active customers who have not unsubscribed. {total} eligible in total. Save the draft before sending; unsaved edits are not sent.</p>
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs font-bold text-[#303030]"><span className="block">Sort</span><select name="sort" defaultValue={sort} className="min-h-11 rounded-control border border-border bg-surface px-3 text-sm font-medium"><option value="asc">Name A–Z</option><option value="desc">Name Z–A</option></select></label>
        <label className="space-y-1 text-xs font-bold text-[#303030]"><span className="block">Show</span><select name="top" defaultValue={String(top)} className="min-h-11 rounded-control border border-border bg-surface px-3 text-sm font-medium">{limits.map((limit) => <option key={limit} value={limit}>Top {limit}</option>)}</select></label>
        <Button type="submit" variant="outline" size="compact">Apply</Button>
      </form>
      {customers.length ? <MarketingSendForm key={`${sort}-${top}`} campaignId={campaignId} customers={customers} minSendAt={minSendAt} maxSendAt={maxSendAt} /> : <p className="text-sm text-muted">No eligible customers yet.</p>}
    </Card>
  );
}

async function DeliverySummary({ campaign }: { campaign: { id: string; status: string; scheduledAt: Date | null; sentAt: Date | null; updatedAt: Date } }) {
  const [counts, recipients] = await Promise.all([
    recipientCounts(campaign.id),
    prisma.marketingCampaignRecipient.findMany({ where: { campaignId: campaign.id }, orderBy: [{ status: "asc" }, { email: "asc" }], take: 500, select: { id: true, email: true, name: true, status: true, error: true } }),
  ]);
  const when = (date: Date | null) => (date ? date.toLocaleString("en-CH", { timeZone: "Europe/Zurich", dateStyle: "medium", timeStyle: "short" }) : null);
  const failed = counts.FAILED ?? 0;
  const { stale, cancellable } = deliveryState(campaign);
  return (
    <Card className="border-border bg-surface p-5">
      <h2 className="mb-2 font-display text-lg font-bold">Delivery</h2>
      <p className="mb-4 text-sm">{campaign.status === "SCHEDULED" ? `Scheduled for ${when(campaign.scheduledAt)} (Zurich time).` : campaign.sentAt ? `Sent ${when(campaign.sentAt)}.` : campaign.status === "SENDING" ? "Sending is in progress." : null} Resend accepted the emails; inbox delivery is not tracked here.</p>
      <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["SENT", "SCHEDULED", "PENDING", "FAILED", "CANCELLED"] as const).map((status) => <div key={status} className="rounded-lg border bg-background p-3"><dt className="text-xs font-bold text-muted">{status}</dt><dd className="text-xl font-bold">{counts[status] ?? 0}</dd></div>)}
      </dl>
      {failed || stale ? <form action={retryMarketingCampaign} className="mb-5"><input type="hidden" name="id" value={campaign.id} /><Button type="submit" size="compact">{stale ? "Resume sending" : `Retry ${failed} failed`}</Button></form> : null}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b bg-[#F6F6F7] text-xs uppercase text-muted"><tr><th className="p-3">Recipient</th><th className="p-3">Status</th><th className="p-3">Error</th></tr></thead>
          <tbody className="divide-y">{recipients.map((recipient) => <tr key={recipient.id}><td className="p-3"><span className="font-semibold">{recipient.name ?? "—"}</span><br />{recipient.email}</td><td className="p-3 font-bold">{recipient.status}</td><td className="p-3 text-xs text-destructive">{recipient.error ?? ""}</td></tr>)}</tbody>
        </table>
      </div>
      {cancellable ? <div className="mt-8 border-t border-destructive/30 pt-5"><h3 className="mb-2 text-sm font-bold text-destructive">Danger zone</h3><CancelCampaignDialog id={campaign.id} recipients={counts.SCHEDULED ?? 0} /></div> : null}
    </Card>
  );
}