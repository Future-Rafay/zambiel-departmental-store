import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the theme tokens from globals.css so overrides like `rounded-card` replace `rounded-control`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["control", "card", "pill"],
      shadow: ["card", "card-hover", "bar"],
      spacing: ["control", "control-compact", "control-x", "control-x-compact"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
