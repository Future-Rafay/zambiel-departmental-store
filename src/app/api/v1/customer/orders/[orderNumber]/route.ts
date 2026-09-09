import { getCustomerApiUser } from "@/server/auth/customer-mobile";
import { getTrackedOrder } from "@/server/services/ordering";

export async function GET(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const user = await getCustomerApiUser(request);
  const token = new URL(request.url).searchParams.get("token") ?? undefined;
  const order = await getTrackedOrder((await params).orderNumber, user?.id, token);
  return order ? Response.json({ order }) : Response.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
}
