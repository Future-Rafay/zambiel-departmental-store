import { requireCustomerApiUser } from "@/server/auth/customer-mobile";
import { apiError } from "@/server/http";
import { getReorderCart } from "@/server/services/ordering";
export async function POST(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) { try { const user = await requireCustomerApiUser(request); const items = await getReorderCart((await params).orderNumber, user.id); return items ? Response.json({ items }) : Response.json({ error: "ORDER_NOT_FOUND" }, { status: 404 }); } catch (error) { return apiError(error); } }
