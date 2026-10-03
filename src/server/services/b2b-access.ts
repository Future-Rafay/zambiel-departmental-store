import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db";

export async function getB2bViewer() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return { user: null, status: "NONE" } as const;
  const user = await prisma.user.findFirst({
    where: { id: sessionUser.id, active: true },
    select: { id: true, name: true, email: true, b2b_status: true },
  });
  return { user, status: user?.b2b_status ?? "NONE" };
}
