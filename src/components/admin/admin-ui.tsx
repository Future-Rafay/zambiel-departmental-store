import Link from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

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
          <h1 className="font-display text-2xl font-bold text-[#202223] tracking-tight">
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
  const deletedLabel =
    deleted === "product" || deleted === "variant" || deleted === "category"
      ? deleted
      : "Item";
  return (
    <div
      role={error || warning ? "alert" : "status"}
      className={cn(
        "mb-6 flex items-center gap-3 rounded-xl border p-4 text-xs font-semibold shadow-xs animate-scale-in",
        error
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : warning
            ? "border-amber-500/40 bg-amber-50 text-amber-900"
            : "border-emerald-500/40 bg-emerald-50 text-emerald-800",
      )}
    >
      {error ? (
        <AlertCircle className="h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      )}
      <span>
        {error
          ? error.replaceAll("_", " ")
          : warning
            ? "Invitation saved, but the email could not be sent. Check the Resend configuration and invite again."
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
      <Label htmlFor={inputId} className="text-xs font-bold text-[#303030]">
        {label}
      </Label>
      <Input
        {...props}
        id={inputId}
        name={name}
        className="min-h-11 rounded-control border-border bg-surface px-3 text-sm shadow-2xs focus:border-primary focus:ring-1 focus:ring-ring"
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
      <Label htmlFor={inputId} className="text-xs font-bold text-[#303030]">
        {label}
      </Label>
      <textarea
        id={inputId}
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        required={required}
        className="min-h-11 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
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
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: ReactNode;
  id?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? `${name}-${generatedId}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="text-xs font-bold text-[#303030]">
        {label}
      </Label>
      <select
        id={inputId}
        name={name}
        defaultValue={defaultValue}
        className="min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-medium shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {children}
      </select>
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
    <label className="flex items-center gap-2.5 text-xs font-bold text-[#303030] cursor-pointer py-1">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-[#C9CCCF] text-primary focus:ring-primary"
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
      <Button
        type="submit"
        size="default"
        className="shadow-xs font-bold bg-primary hover:bg-primary-light text-xs"
      >
        {label}
      </Button>
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
      className="inline-flex min-h-11 items-center rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-2xs transition-colors hover:bg-surface-warm"
    >
      {children}
    </Link>
  );
}
