import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-light shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-light shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm font-bold",
  outline: "border-2 border-primary/20 bg-surface/80 text-primary hover:border-primary hover:bg-primary/5 active:bg-primary/10",
  ghost: "text-foreground hover:bg-primary/10 hover:text-primary",
  destructive: "bg-destructive text-white hover:brightness-110 shadow-sm active:translate-y-0",
} as const;

const sizes = {
  default: "min-h-11 px-6 py-2.5 text-base",
  compact: "min-h-11 px-4 py-2 text-sm",
} as const;

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  className,
  type = "button",
  variant = "primary",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

