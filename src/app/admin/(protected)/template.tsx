import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/server/auth/current-user";
import { getStaffApkUrl } from "@/config/env";

export default async function AdminTemplate({ children }: { children: ReactNode }) {
  const user = await requireRole("OWNER", "STAFF");
  const email = user.email ?? "admin@localhost";
  const name = user.name ?? email.split("@")[0];

  return (
    <AdminShell
      user={{
        id: user.id,
        email,
        name,
        role: user.role as "OWNER" | "STAFF",
      }}
      staffApkUrl={getStaffApkUrl()}
    >
      {children}
    </AdminShell>
  );
}
