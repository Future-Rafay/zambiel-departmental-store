import { requireCustomerApiUser } from "@/server/auth/customer-mobile";
import { prisma } from "@/server/db";
import { apiError } from "@/server/http";
import { mobileProfileSchema } from "@/server/validators/customer-mobile";

export async function GET(request: Request) { try { const user = await requireCustomerApiUser(request); const account = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, email: true, name: true, phone: true, addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }, deletionRequest: { select: { status: true, createdAt: true } } } }); return Response.json({ account }); } catch (error) { return apiError(error); } }
export async function PATCH(request: Request) { try { const user = await requireCustomerApiUser(request); const value = mobileProfileSchema.parse(await request.json()); const account = await prisma.user.update({ where: { id: user.id }, data: value, select: { id: true, email: true, name: true, phone: true } }); return Response.json({ account }); } catch (error) { return apiError(error); } }
