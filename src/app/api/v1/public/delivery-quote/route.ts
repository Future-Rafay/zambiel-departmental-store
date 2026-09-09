import { apiError } from "@/server/http";
import { getDeliveryQuote } from "@/server/services/ordering";
import { deliveryQuoteSchema } from "@/server/validators/order";

export async function POST(request: Request) {
  try {
    const input = deliveryQuoteSchema.parse(await request.json());
    return Response.json(await getDeliveryQuote(input.countryCode, input.subtotalRappen));
  } catch (error) {
    return apiError(error);
  }
}
