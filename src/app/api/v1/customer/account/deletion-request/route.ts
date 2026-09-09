import { requireCustomerApiUser } from "@/server/auth/customer-mobile";
import { prisma } from "@/server/db";
import { apiError } from "@/server/http";
import { deletionRequestSchema } from "@/server/validators/customer-mobile";
export async function POST(request: Request) { try { const user = await requireCustomerApiUser(request); const value = deletionRequestSchema.parse(await request.json()); const deletionRequest = await prisma.customerDeletionRequest.upsert({ where: { userId: user.id }, create: { userId: user.id, reason: value.reason }, update: { reason: value.reason, status: "REQUESTED", resolvedAt: null }, select: { status: true, createdAt: true } }); await prisma.customerMobileSession.deleteMany({ where: { userId: user.id } }); return Response.json({ deletionRequest }, { status: 202 }); } catch (error) { return apiError(error); } }
