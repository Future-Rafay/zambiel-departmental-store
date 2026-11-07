// Re-theme fonts here: swap the two next/font imports, then update `theme.fonts` names in theme.ts.
// next/font must be called with literal options at module scope, so this cannot live in theme.ts.
import { Archivo, Inter } from "next/font/google";

export const displayFont = Inter({ subsets: ["latin"], variable: "--font-loaded-display" });
export const bodyFont = Archivo({ subsets: ["latin"], variable: "--font-loaded-body" });
