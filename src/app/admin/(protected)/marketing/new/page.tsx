import Link from "next/link";

import { AdminPage, Notice } from "@/components/admin/admin-ui";
import { MarketingCampaignForm } from "@/components/admin/marketing-campaign-form";
import { getEmailEnv } from "@/config/env";
import { marketingStarterTemplate, marketingStarterTemplateKeys, type MarketingStarterTemplate } from "@/server/email/marketing";

export default async function NewMarketingCampaignPage({ searchParams }: { searchParams: Promise<{ template?: string; error?: string }> }) {
  const query = await searchParams;
  const key: MarketingStarterTemplate = marketingStarterTemplateKeys.find((candidate) => candidate === query.template) ?? "blank";
  const shopUrl = `${getEmailEnv().APP_URL}/de`;
  const template = marketingStarterTemplate(key, shopUrl);
  return (
    <AdminPage title="New campaign" description="Start from a template or a blank email. Save the draft, then choose recipients.">
      <Notice error={query.error} />
      <nav aria-label="Email templates" className="mb-5 flex flex-wrap gap-2">
        {marketingStarterTemplateKeys.map((candidate) => (
          <Link key={candidate} href={`/admin/marketing/new?template=${candidate}`} aria-current={candidate === key ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold ${candidate === key ? "border-primary bg-primary text-white" : "bg-white hover:border-primary"}`}>
            {marketingStarterTemplate(candidate, shopUrl).label}
          </Link>
        ))}
      </nav>
      <MarketingCampaignForm key={key} campaign={{ name: `${template.label} campaign`, subject: template.subject, locale: "DE", html: template.html }} />
    </AdminPage>
  );
}