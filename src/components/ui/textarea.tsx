import type { ComponentProps } from "react";

import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClasses, "py-3", className)} {...props} />;
}
