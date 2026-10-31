import { saveMarketingCampaign } from "@/app/admin/(protected)/marketing/actions";
import { Field, SaveBar, SelectField } from "@/components/admin/admin-ui";
import { DeferredUploadForm } from "@/components/admin/deferred-upload-form";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Card } from "@/components/ui/card";

export function MarketingCampaignForm({ campaign }: { campaign: { id?: string; name: string; subject: string; locale: "DE" | "EN"; html: string } }) {
  return (
    <Card className="border-border bg-surface p-5">
      <h2 className="mb-4 font-display text-lg font-bold">1. Design the email</h2>
      <DeferredUploadForm action={saveMarketingCampaign} className="grid gap-4 sm:grid-cols-2">
        {campaign.id ? <input type="hidden" name="id" value={campaign.id} /> : null}
        <Field label="Internal campaign name" name="name" defaultValue={campaign.name} required maxLength={160} />
        <SelectField label="Email language" name="locale" defaultValue={campaign.locale}>
          <option value="DE">German</option>
          <option value="EN">English</option>
        </SelectField>
        <Field label="Subject line" name="subject" defaultValue={campaign.subject} required maxLength={200} className="sm:col-span-2" />
        <RichTextEditor
          label="Email content"
          name="html"
          defaultValue={campaign.html}
          variant="email"
          hint="Use headings, colours, links, and images. Insert fields such as {{name}} to personalise each email. Images upload when the draft is saved."
        />
        <div className="sm:col-span-2">
          <SaveBar returnTo="/admin/marketing" label="Save draft" />
        </div>
      </DeferredUploadForm>
    </Card>
  );
}
