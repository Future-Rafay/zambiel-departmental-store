import { pageTitleMetadata } from "@/lib/metadata";
import type { ReactNode } from "react";

export const generateMetadata = pageTitleMetadata({ de: "B2B-Shop", en: "B2B Shop" }, { index: false, follow: false });

export default function B2bLayout({ children }: { children: ReactNode }) {
  return children;
}
