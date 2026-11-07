import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/** Scrollable bordered frame around a <table>. */
export function TableShell({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("overflow-x-auto rounded-card border border-border bg-surface", className)} {...props} />;
}

export const tableClasses = "w-full text-left text-sm";
export const tableHeadClasses = "border-b border-border bg-surface-muted text-xs uppercase text-muted";
