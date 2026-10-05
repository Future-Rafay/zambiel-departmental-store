import { adminAction } from "@/app/admin/(protected)/actions";
import {
  AdminPage,
  Field,
  Notice,
  SaveBar,
} from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { getSettingsAdminData } from "@/server/services/admin";

export default async function GeneralSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [{ site }, feedback] = await Promise.all([
    getSettingsAdminData(),
    searchParams,
  ]);
  const returnTo = "/admin/settings/general";

  return (
    <AdminPage
      title="Site settings"
      description="Business contact details and storefront colours. Brand assets and public content are managed in source configuration."
    >
      <Notice {...feedback} />
      <Card>
        <form action={adminAction} className="space-y-6">
          <input type="hidden" name="intent" value="site_settings" />
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-display text-xl font-semibold sm:col-span-2">
              Business details
            </legend>
            <Field
              label="Display name"
              name="displayName"
              defaultValue={site.displayName}
              required
            />
            <Field
              label="Legal name"
              name="legalName"
              defaultValue={site.legalName ?? ""}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              defaultValue={site.email ?? ""}
            />
            <Field
              label="Phone"
              name="phone"
              type="tel"
              defaultValue={site.phone ?? ""}
            />
            <Field
              label="Street"
              name="street"
              defaultValue={site.street ?? ""}
            />
            <Field
              label="Postcode"
              name="postalCode"
              defaultValue={site.postalCode ?? ""}
            />
            <Field
              label="City"
              name="city"
              defaultValue={site.city ?? ""}
            />
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-display text-xl font-semibold sm:col-span-2">
              Storefront colours
            </legend>
            <Field
              label="Primary colour"
              name="primaryColor"
              type="color"
              defaultValue={site.primaryColor}
              required
            />
            <Field
              label="Secondary colour"
              name="secondaryColor"
              type="color"
              defaultValue={site.secondaryColor}
              required
            />
          </fieldset>
          <SaveBar returnTo={returnTo} />
        </form>
      </Card>
    </AdminPage>
  );
}
