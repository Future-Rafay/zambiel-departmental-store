import { requireCustomerApiUser } from "@/server/auth/customer-mobile";
import { prisma } from "@/server/db";
import { apiError } from "@/server/http";
export async function DELETE(request: Request, { params }: { params: Promise<{ productId: string }> }) { try { const user = await requireCustomerApiUser(request); await prisma.customerWishlist.deleteMany({ where: { userId: user.id, productId: (await params).productId } }); return new Response(null, { status: 204 }); } catch (error) { return apiError(error); } }
