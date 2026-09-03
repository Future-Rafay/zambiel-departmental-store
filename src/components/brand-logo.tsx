import Image from "next/image";

import { cn } from "@/lib/cn";

export function BrandLogo({
  compact = false,
  priority = false,
  className = "",
  inverted = false,
}: {
  compact?: boolean;
  priority?: boolean;
  className?: string;
  inverted?: boolean;
}) {
  return (
    <Image
      src={
        inverted
          ? "/images/zambiel-logo-white.png"
          : "/images/zambiel-logo.png"
      }
      alt="Zambiel"
      width={200}
      height={106}
      priority={priority}
      className={cn(
        compact ? "h-9 w-auto max-w-24" : "h-16 w-auto max-w-36",
        "object-contain",
        className,
      )}
    />
  );
}
