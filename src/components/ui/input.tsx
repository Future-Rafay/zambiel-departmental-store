import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/** Shared look for text inputs, selects and textareas, including validation and disabled states. */
export const fieldClasses =
  "min-h-control w-full rounded-control border border-border bg-surface px-4 py-2 text-base text-foreground placeholder:text-muted/70 transition-all duration-200 focus:border-secondary disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error data-[valid=true]:border-success";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClasses, className)} {...props} />;
}
