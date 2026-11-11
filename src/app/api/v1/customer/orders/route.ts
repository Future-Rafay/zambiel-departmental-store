import {
  getCustomerApiUser,
  requireCustomerApiUser,
} from "@/server/auth/customer-mobile";
import { apiError, assertSameOrigin } from "@/server/http";
import {
  consumePublicRateLimit,
  getForwardedClientIp,
  rateLimitedResponse,
} from "@/server/public-rate-limit";
import { createOrder, getCustomerOrdersPage } from "@/server/services/ordering";
import { createOrderSchema } from "@/server/validators/order";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    // Guests can order cash on delivery, which takes stock and sends an email: cap it per IP and per email.
    const clientIp = getForwardedClientIp(request.headers);
    if (clientIp) {
      const limit = await consumePublicRateLimit({ scope: "order-ip", identifier: clientIp, limit: 10, windowMs: 15 * 60_000 });
      if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);
    }
    const input = createOrderSchema.parse(await request.json());
    const emailLimit = await consumePublicRateLimit({ scope: "order-email", identifier: input.customerEmail, limit: 10, windowMs: 60 * 60_000 });
    if (!emailLimit.allowed) return rateLimitedResponse(emailLimit.retryAfterSeconds);
    const user = await getCustomerApiUser(request);
    const order = await createOrder(input, user?.id);
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
