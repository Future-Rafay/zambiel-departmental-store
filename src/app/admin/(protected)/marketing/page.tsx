import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminPage, EditLink, Empty, Notice } from "@/components/admin/admin-ui";
import { CampaignStatusBadge } from "@/components/admin/marketing-status";
import { prisma } from "@/server/db";

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [query, campaigns] = await Promise.all([
    searchParams,
    prisma.marketingCampaign.findMany({ orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, name: true, subject: true, status: true, scheduledAt: true, sentAt: true, updatedAt: true, _count: { select: { recipients: true } } } }),
  ]);
  const when = (date: Date | null) => (date ? date.toLocaleString("en-CH", { timeZone: "Europe/Zurich", dateStyle: "medium", timeStyle: "short" }) : "—");
  return (
    <AdminPage
      title="Email marketing"
      description="Design an email, choose registered customers, then send now or schedule. Every customer receives a separate email through Resend."
      actions={<Link href="/admin/marketing/new" className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 text-sm font-bold text-white hover:bg-primary-light"><Plus className="size-4" aria-hidden="true" />New campaign</Link>}
    >
      <Notice {...query} />
      {campaigns.length === 0 ? <Empty>No campaigns yet. Create one from a template or a blank email.</Empty> : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-[#F6F6F7] text-xs uppercase text-muted"><tr><th className="p-4">Campaign</th><th className="p-4">Status</th><th className="p-4">Recipients</th><th className="p-4">Sent / scheduled</th><th className="p-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="p-4"><Link href={`/admin/marketing/${campaign.id}`} className="font-bold text-primary">{campaign.name}</Link><br /><span className="text-muted">{campaign.subject}</span></td>
                  <td className="p-4"><CampaignStatusBadge status={campaign.status} scheduledAt={campaign.scheduledAt} /></td>
                  <td className="p-4">{campaign._count.recipients}</td>
                  <td className="p-4">{when(campaign.sentAt ?? campaign.scheduledAt)}</td>
                  <td className="p-4 text-right"><EditLink href={`/admin/marketing/${campaign.id}`}>{campaign.status === "DRAFT" ? "Continue" : "View"}</EditLink></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}