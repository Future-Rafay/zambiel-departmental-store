import { requireCustomerApiUser } from "@/server/auth/customer-mobile";
import { prisma } from "@/server/db";
import { apiError, assertSameOrigin } from "@/server/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCustomerApiUser(request);
    await prisma.user.updateMany({
      where: { id: user.id, b2b_status: { in: ["NONE", "REJECTED"] } },
      data: { b2b_status: "PENDING", is_b2b_authorized: false },
    });
    const current = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { b2b_status: true } });
    return Response.json({ status: current.b2b_status });
  } catch (error) {
    return apiError(error);
  }
}
