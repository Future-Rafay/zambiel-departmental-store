import { getCustomerApiUser } from "@/server/auth/customer-mobile";
import { apiError } from "@/server/http";
import { resumeMobilePayment } from "@/server/services/mobile-payment";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const [user, input, { orderNumber }] = await Promise.all([
      getCustomerApiUser(request),
      request.json() as Promise<{ trackingToken?: string }>,
      params,
    ]);
    return Response.json(
      await resumeMobilePayment(orderNumber, user?.id, input.trackingToken),
    );
  } catch (error) {
    return apiError(error);
  }
}
