import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 py-2 text-base text-foreground placeholder:text-muted/70 transition-all duration-200 focus:border-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}
