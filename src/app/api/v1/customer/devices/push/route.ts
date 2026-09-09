import { getCustomerApiUser } from "@/server/auth/customer-mobile";
import { apiError } from "@/server/http";
import { removePushSubscription, savePushSubscription } from "@/server/services/mobile-push";

export async function POST(request: Request) {
  try {
    const [user, input] = await Promise.all([getCustomerApiUser(request), request.json()]);
    await savePushSubscription(input, user?.id);
    return new Response(null, { status: 204 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const [user, input] = await Promise.all([getCustomerApiUser(request), request.json()]);
    await removePushSubscription(input, user?.id);
    return new Response(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
