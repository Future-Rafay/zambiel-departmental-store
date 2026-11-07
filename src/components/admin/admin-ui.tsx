import Link from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { DeferredSubmitButton } from "@/components/admin/deferred-upload-form";
import { tones } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

// Admin forms are denser than the storefront: smaller text and padding, same tokens.
const adminFieldClasses = "px-3 text-sm shadow-2xs focus:border-primary focus:ring-1 focus:ring-ring";

export function AdminPage({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-xs text-muted leading-normal">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Notice({
  saved,
  error,
  warning,
  deleted,
}: {
  saved?: string;
  error?: string;
  warning?: string;
  deleted?: string;
}) {
  if (!saved && !error && !warning && !deleted) return null;
  const catalogErrors: Record<string, string> = {
    PRODUCT_SLUG_TAKEN: "This slug is already in use. Please choose a different slug.",
    PRODUCT_CATEGORY_MODE_MISMATCH: "Choose a category in the same B2C or B2B catalog as the product.",
    CATEGORY_PARENT_MODE_MISMATCH: "Choose a parent category in the same catalog, or make this a top-level category.",
    CATEGORY_HAS_OTHER_MODE_PRODUCTS: "Move this category's products to a compatible category before changing its B2C or B2B setting.",
    CATEGORY_HAS_OTHER_MODE_CHILDREN: "Move or change this category's subcategories before changing its B2C or B2B setting.",
    CATEGORY_HAS_MIXED_DEPENDENTS: "Move this category's products and subcategories before changing its B2C or B2B setting.",
    NO_RECIPIENTS: "Select at least one eligible customer.",
    SCHEDULE_OUT_OF_RANGE: "Choose a send time between 5 minutes and 30 days from now.",
    CAMPAIGN_NOT_DRAFT: "This campaign was already sent or scheduled. Duplicate it to make changes.",
    EMAIL_BODY_REQUIRED: "Add some email content before saving.",
    EMAIL_NOT_CONFIGURED: "Email sending is not configured. Add a valid Resend API key.",
    TEST_SEND_FAILED: "The test email could not be sent. Check the Resend configuration and sender domain.",
    CANCEL_PARTIALLY_FAILED: "Some scheduled emails could not be cancelled. Their errors are listed below; try again.",
    RECIPIENT_NOT_EXCLUDABLE: "Only failed recipients can be excluded.",
    STRIPE_PAYMENT_IN_PROGRESS: "The customer already completed Stripe Checkout. Wait for the payment to confirm, then refund and cancel.",
    INVENTORY_BELOW_RESERVED: "Stock cannot go below zero or below the quantity reserved by open checkouts.",
  };
  const deletedLabel =
    deleted === "product" || deleted === "variant" || deleted === "category"
      ? deleted
      : "Item";
  return (
    <div
      role={error || warning ? "alert" : "status"}
      className={cn(
        "mb-6 flex items-center gap-3 rounded-card border p-4 text-xs font-semibold shadow-xs animate-scale-in",
        error
          ? tones.error.soft
          : warning
            ? tones.warning.soft
            : tones.success.soft,
      )}
    >
      {error ? (
        <AlertCircle className="h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      )}
      <span>
        {error
          ? catalogErrors[error] ?? error.replaceAll("_", " ")
          : warning
            ? warning === "CATALOG_AUDIT_FAILED" ? "Changes saved, but the audit entry failed. Contact an administrator; do not submit again." : "Invitation saved, but the email could not be sent. Check the Resend configuration and invite again."
            : deleted === "campaign"
              ? "Draft campaign deleted."
              : deleted
              ? `${deletedLabel[0].toUpperCase()}${deletedLabel.slice(1)} deleted from the catalog.`
              : "Changes successfully saved."}
      </span>
    </div>
  );
}

export function Field({
  label,
  name,
  className,
  ...props
}: { label: string; name: string } & ComponentProps<typeof Input>) {
  const generatedId = useId();
  const inputId = props.id ?? `${name}-${generatedId}`;
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={inputId} className="text-xs font-bold text-foreground">
        {label}
      </Label>
      <Input
        {...props}
        id={inputId}
        name={name}
        className={adminFieldClasses}
      />
    </div>
  );
}

export function TextareaField({
  label,
  name,
  defaultValue,
  rows = 3,
  id,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  id?: string;
  required?: boolean;
}) {
  const generatedId = useId();
  const inputId = id ?? `${name}-${generatedId}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="text-xs font-bold text-foreground">
        {label}
      </Label>
      <Textarea
        id={inputId}
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        required={required}
        className={cn(adminFieldClasses, "py-2")}
      />
    </div>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  children,
  id,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: ReactNode;
  id?: string;
  required?: boolean;
}) {
  const generatedId = useId();
  const inputId = id ?? `${name}-${generatedId}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="text-xs font-bold text-foreground">
        {label}
      </Label>
      <Select
        id={inputId}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={cn(adminFieldClasses, "font-medium")}
      >
        {children}
      </Select>
    </div>
  );
}

export function Check({
  label,
  name,
  defaultChecked = false,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer py-1">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded-control border-border-strong text-primary focus:ring-primary"
      />
      <span>{label}</span>
    </label>
  );
}

export function SaveBar({
  returnTo,
  label = "Save changes",
}: {
  returnTo: string;
  label?: string;
}) {
  return (
    <div className="mt-6 flex justify-end border-t border-border pt-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      <DeferredSubmitButton
        size="compact"
        className="shadow-xs font-bold"
      >
        {label}
      </DeferredSubmitButton>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Card className="border-border bg-surface p-8 text-center">
      <p className="text-xs font-medium text-muted">{children}</p>
    </Card>
  );
}

export function EditLink({
  href,
  children = "Manage",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={buttonClasses({ variant: "subtle", size: "compact", className: "px-3 font-bold" })}
    >
      {children}
    </Link>
  );
}
