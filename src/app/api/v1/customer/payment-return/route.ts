import { parseOrderNumber } from "@/lib/orders";

export function GET(request: Request) {
  const orderNumber = new URL(request.url).searchParams.get("orderNumber") ?? "";
  if (!parseOrderNumber(orderNumber)) return Response.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  return new Response(null, { status: 303, headers: { Location: `zambiel://orders/${encodeURIComponent(orderNumber)}`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
