import type { MarketingCampaignStatus } from "@/generated/prisma/enums";

const styles: Record<string, string> = { DRAFT: "bg-gray-100 text-gray-700", SENDING: "bg-amber-100 text-amber-800", SCHEDULED: "bg-sky-100 text-sky-800", SENT: "bg-emerald-100 text-emerald-800", CANCELLED: "bg-red-100 text-red-700" };

// Resend delivers scheduled emails itself, so a scheduled campaign whose time has passed is shown as sent.
export function campaignStatusLabel(status: MarketingCampaignStatus, scheduledAt: Date | null) {
  if (status === "SCHEDULED" && scheduledAt && scheduledAt <= new Date()) return "SENT";
  return status;
}

export function CampaignStatusBadge({ status, scheduledAt }: { status: MarketingCampaignStatus; scheduledAt: Date | null }) {
  const label = campaignStatusLabel(status, scheduledAt);
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[label]}`}>{label}</span>;
}