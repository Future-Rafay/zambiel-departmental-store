/**
 * Zambiel design tokens: the single place to re-theme admin, storefront and email.
 * Fonts are loaded in `src/config/fonts.ts` (next/font needs literal calls); keep `fonts` below in sync.
 * Lighter/darker shades and tints are derived from these colours in `globals.css`.
 */
export type Corners = "sharp" | "rounded";

export const theme = {
  corners: "sharp" as Corners,

  radius: {
    sharp: { control: "0px", card: "0px", pill: "0px" },
    rounded: { control: "0.5rem", card: "0.75rem", pill: "9999px" },
  },

  colors: {
    primary: "#154912",
    primaryForeground: "#FFFFFF",
    secondary: "#D6A84B",
    secondaryForeground: "#14211E",
    background: "#F4F7F3",
    surface: "#FFFFFF",
    surfaceMuted: "#F6F7F6",
    surfaceWarm: "#E8EFEA",
    foreground: "#102722",
    muted: "#5E6F69",
    border: "#D7E1DB",
    borderStrong: "#C9CCCF",
    overlay: "#000000",
    success: "#287A54",
    warning: "#B54708",
    error: "#B42318",
    info: "#1D4ED8",
    // Order status hues used by admin and customer order badges.
    status: {
      pending: "#C2410C",
      confirmed: "#1D4ED8",
      processing: "#7E22CE",
      ready: "#4338CA",
      transit: "#0E7490",
      done: "#047857",
      cancelled: "#B42318",
    },
  },

  fonts: { display: "Inter", body: "Archivo" },

  typography: {
    sizes: {
      "2xs": ["0.6875rem", "1rem"],
      xs: ["0.75rem", "1rem"],
      sm: ["0.875rem", "1.25rem"],
      base: ["1rem", "1.5rem"],
      lg: ["1.125rem", "1.75rem"],
      xl: ["1.25rem", "1.75rem"],
      "2xl": ["1.5rem", "2rem"],
      "3xl": ["1.875rem", "2.25rem"],
      "4xl": ["2.25rem", "2.5rem"],
      "5xl": ["3rem", "1"],
      "6xl": ["3.75rem", "1"],
      "7xl": ["4.5rem", "1"],
    },
    weights: { normal: "400", medium: "500", semibold: "600", bold: "700", extrabold: "800" },
    leading: { tight: "1.25", snug: "1.375", normal: "1.5", relaxed: "1.625", loose: "2" },
  },

  // Tailwind spacing unit: p-4 = 4 × this value.
  spacing: "0.25rem",

  borderWidth: "1px",

  shadows: {
    "2xs": "0 1px rgb(0 0 0 / 0.05)",
    xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    card: "0 4px 20px -4px rgb(16 39 34 / 0.05)",
    cardHover: "0 12px 30px -6px rgb(16 39 34 / 0.12)",
    bar: "0 -4px 16px rgb(0 0 0 / 0.08)",
  },

  focus: { width: "3px", offset: "2px" },

  controls: {
    height: "2.75rem", // 44px minimum touch target (WCAG 2.2)
    heightCompact: "2.75rem", // kept at 44px too; compact differs by padding and text size
    paddingX: "1.5rem",
    paddingXCompact: "1rem",
  },
};

/** CSS custom properties for `<html style>`; `globals.css` maps them into Tailwind. */
export function themeCssVariables(t: typeof theme = theme): Record<string, string> {
  const vars: Record<string, string> = {};
  const radius = t.radius[t.corners];
  for (const [key, value] of Object.entries(radius)) vars[`--t-radius-${key}`] = value;

  const { status, ...colors } = t.colors;
  for (const [key, value] of Object.entries(colors)) vars[`--t-color-${kebab(key)}`] = value;
  for (const [key, value] of Object.entries(status)) vars[`--t-status-${key}`] = value;

  for (const [key, [size, leading]] of Object.entries(t.typography.sizes)) {
    vars[`--t-text-${key}`] = size;
    vars[`--t-text-${key}-leading`] = leading;
  }
  for (const [key, value] of Object.entries(t.typography.weights)) vars[`--t-weight-${key}`] = value;
  for (const [key, value] of Object.entries(t.typography.leading)) vars[`--t-leading-${key}`] = value;
  for (const [key, value] of Object.entries(t.shadows)) vars[`--t-shadow-${kebab(key)}`] = value;
  for (const [key, value] of Object.entries(t.controls)) vars[`--t-control-${kebab(key)}`] = value;

  vars["--t-spacing"] = t.spacing;
  vars["--t-border-width"] = t.borderWidth;
  vars["--t-focus-width"] = t.focus.width;
  vars["--t-focus-offset"] = t.focus.offset;
  return vars;
}

function kebab(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
