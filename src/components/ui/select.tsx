import type { ComponentProps } from "react";

import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldClasses, "cursor-pointer", className)} {...props} />;
}
