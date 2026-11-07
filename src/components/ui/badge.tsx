import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

// Literal class strings so Tailwind can see them. Colours come from theme.ts.
export const tones = {
  neutral: { soft: "border-border bg-surface-muted text-muted", solid: "border-foreground bg-foreground text-surface", outline: "border-border text-foreground hover:bg-background" },
  primary: { soft: "border-primary/25 bg-primary/10 text-primary", solid: "border-primary bg-primary text-primary-foreground", outline: "border-primary/40 text-primary hover:bg-primary/5" },
  secondary: { soft: "border-secondary/40 bg-secondary/15 text-secondary-text", solid: "border-secondary bg-secondary text-secondary-foreground", outline: "border-secondary/50 text-secondary-text hover:bg-secondary/10" },
  success: { soft: "border-success/30 bg-success/10 text-success", solid: "border-success bg-success text-primary-foreground", outline: "border-success/40 text-success hover:bg-success/5" },
  warning: { soft: "border-warning/30 bg-warning/10 text-warning", solid: "border-warning bg-warning text-primary-foreground", outline: "border-warning/40 text-warning hover:bg-warning/5" },
  error: { soft: "border-error/30 bg-error/10 text-error", solid: "border-error bg-error text-primary-foreground", outline: "border-error/40 text-error hover:bg-error/5" },
  info: { soft: "border-info/30 bg-info/10 text-info", solid: "border-info bg-info text-primary-foreground", outline: "border-info/40 text-info hover:bg-info/5" },
  "status-pending": { soft: "border-status-pending/30 bg-status-pending/10 text-status-pending", solid: "border-status-pending bg-status-pending text-primary-foreground", outline: "border-status-pending/40 text-status-pending hover:bg-status-pending/5" },
  "status-confirmed": { soft: "border-status-confirmed/30 bg-status-confirmed/10 text-status-confirmed", solid: "border-status-confirmed bg-status-confirmed text-primary-foreground", outline: "border-status-confirmed/40 text-status-confirmed hover:bg-status-confirmed/5" },
  "status-processing": { soft: "border-status-processing/30 bg-status-processing/10 text-status-processing", solid: "border-status-processing bg-status-processing text-primary-foreground", outline: "border-status-processing/40 text-status-processing hover:bg-status-processing/5" },
  "status-ready": { soft: "border-status-ready/30 bg-status-ready/10 text-status-ready", solid: "border-status-ready bg-status-ready text-primary-foreground", outline: "border-status-ready/40 text-status-ready hover:bg-status-ready/5" },
  "status-transit": { soft: "border-status-transit/30 bg-status-transit/10 text-status-transit", solid: "border-status-transit bg-status-transit text-primary-foreground", outline: "border-status-transit/40 text-status-transit hover:bg-status-transit/5" },
  "status-done": { soft: "border-status-done/30 bg-status-done/10 text-status-done", solid: "border-status-done bg-status-done text-primary-foreground", outline: "border-status-done/40 text-status-done hover:bg-status-done/5" },
  "status-cancelled": { soft: "border-status-cancelled/30 bg-status-cancelled/10 text-status-cancelled", solid: "border-status-cancelled bg-status-cancelled text-primary-foreground", outline: "border-status-cancelled/40 text-status-cancelled hover:bg-status-cancelled/5" },
} as const;

export type Tone = keyof typeof tones;

export function badgeClasses(tone: Tone = "neutral", look: "soft" | "solid" = "soft") {
  return cn("inline-flex items-center gap-1 rounded-pill border px-2.5 py-1 text-xs font-bold", tones[tone][look]);
}

export function Badge({ tone = "neutral", look = "soft", className, ...props }: ComponentProps<"span"> & { tone?: Tone; look?: "soft" | "solid" }) {
  return <span className={cn(badgeClasses(tone, look), className)} {...props} />;
}
