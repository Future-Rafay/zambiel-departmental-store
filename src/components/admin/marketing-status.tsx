import type { MarketingCampaignStatus } from "@/generated/prisma/enums";
import { badgeClasses, type Tone } from "@/components/ui/badge";

const statusTones: Record<string, Tone> = { DRAFT: "neutral", SENDING: "warning", SCHEDULED: "info", SENT: "success", CANCELLED: "error" };

// Resend delivers scheduled emails itself, so a scheduled campaign whose time has passed is shown as sent.
export function campaignStatusLabel(status: MarketingCampaignStatus, scheduledAt: Date | null) {
  if (status === "SCHEDULED" && scheduledAt && scheduledAt <= new Date()) return "SENT";
  return status;
}

export function CampaignStatusBadge({ status, scheduledAt }: { status: MarketingCampaignStatus; scheduledAt: Date | null }) {
  const label = campaignStatusLabel(status, scheduledAt);
  return <span className={badgeClasses(statusTones[label] ?? "neutral")}>{label}</span>;
}