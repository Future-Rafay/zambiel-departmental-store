export const colors = {
  primary: "#153B35",
  primaryPressed: "#0E2B27",
  primaryLight: "#2B5C52",
  primarySoft: "#E7F0ED",
  accent: "#D6A84B",
  accentSoft: "#F8EFD9",
  background: "#F7F5F0",
  surface: "#FFFFFF",
  surfaceWarm: "#FBF9F4",
  surfaceMuted: "#E7F0ED",
  text: "#18201E",
  muted: "#66736F",
  border: "#DDE3DF",
  imageBackground: "#EEF1ED",
  danger: "#B42318",
  dangerSoft: "#FDECEA",
  success: "#287A55",
  successSoft: "#E7F5EE",
  overlay: "rgba(10, 22, 19, .56)",
} as const;
export const space = {
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
export const radius = {
  small: 8,
  control: 12,
  card: 16,
  lg: 16,
  hero: 22,
  xl: 22,
  pill: 999,
} as const;
export const iconSize = { small: 18, medium: 22, large: 30 } as const;
export const type = {
  body: "Inter_400Regular",
  strong: "Inter_600SemiBold",
  display: "Archivo_700Bold",
} as const;
export const typography = {
  display: {
    fontFamily: "Archivo_700Bold",
    fontSize: 30,
    lineHeight: 36,
    color: colors.text,
  },
  heading: {
    fontFamily: "Archivo_700Bold",
    fontSize: 25,
    lineHeight: 31,
    color: colors.text,
  },
  section: {
    fontFamily: "Archivo_700Bold",
    fontSize: 21,
    lineHeight: 27,
    color: colors.text,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  bodyMuted: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  price: {
    fontFamily: "Archivo_700Bold",
    fontSize: 17,
    lineHeight: 22,
    color: colors.primary,
  },
  priceLarge: {
    fontFamily: "Archivo_700Bold",
    fontSize: 23,
    lineHeight: 28,
    color: colors.primary,
  },
} as const;
