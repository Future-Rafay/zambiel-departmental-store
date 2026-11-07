import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

type CardProps = ComponentProps<"section"> & {
  hover?: boolean;
};

/** Card styling for elements other than <section>, such as a Link or div. */
export function cardClasses({ hover = false, className }: { hover?: boolean; className?: string } = {}) {
  return cn(
    "rounded-card border border-border/80 bg-surface/90 backdrop-blur-sm p-6 shadow-card transition-all duration-300",
    hover && "hover:shadow-card-hover hover:-translate-y-1 hover:border-secondary/40",
    className,
  );
}

export function Card({ className, hover = false, ...props }: CardProps) {
  return <section className={cardClasses({ hover, className })} {...props} />;
}
