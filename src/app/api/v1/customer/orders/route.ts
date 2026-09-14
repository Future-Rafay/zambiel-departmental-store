import {
  getCustomerApiUser,
  requireCustomerApiUser,
} from "@/server/auth/customer-mobile";
import { apiError, assertSameOrigin } from "@/server/http";
import { createOrder, getCustomerOrdersPage } from "@/server/services/ordering";
import { createOrderSchema } from "@/server/validators/order";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCustomerApiUser(request);
    const order = await createOrder(
      createOrderSchema.parse(await request.json()),
      user?.id,
    );
    return Response.json(order, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireCustomerApiUser(request);
    const page = Number.parseInt(
      new URL(request.url).searchParams.get("page") ?? "1",
      10,
    );
    return Response.json(
      await getCustomerOrdersPage(
        user.id,
        Number.isSafeInteger(page) ? page : 1,
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
