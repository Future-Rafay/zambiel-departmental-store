import type { ReactNode } from "react";
import { OwnerOnly } from "@/components/admin/owner-only";
export default function MarketingLayout({ children }: { children: ReactNode }) { return <OwnerOnly>{children}</OwnerOnly>; }