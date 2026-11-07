import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-light shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary-light shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm font-bold",
  outline: "border-2 border-primary/20 bg-surface/80 text-primary hover:border-primary hover:bg-primary/5 active:bg-primary/10",
  // Quiet bordered button for toolbars, filters and secondary admin actions.
  subtle: "border border-border bg-surface text-foreground shadow-2xs hover:bg-surface-warm",
  ghost: "text-foreground hover:bg-primary/10 hover:text-primary",
  destructive: "bg-destructive text-primary-foreground hover:brightness-110 shadow-sm active:translate-y-0",
} as const;

const sizes = {
  default: "min-h-control px-control-x py-2.5 text-base",
  compact: "min-h-control-compact px-control-x-compact py-2 text-sm",
  icon: "size-control shrink-0 p-0",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

/** Button styling for elements that are not <button>, such as a Next.js <Link>. */
export function buttonClasses({ variant = "primary", size = "default", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-control font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none aria-disabled:pointer-events-none aria-disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  type = "button",
  variant = "primary",
  size = "default",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
