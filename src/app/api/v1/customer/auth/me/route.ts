import { requireCustomerApiUser } from "@/server/auth/customer-mobile";
import { apiError } from "@/server/http";
export async function GET(request: Request) { try { return Response.json({ user: await requireCustomerApiUser(request) }); } catch (error) { return apiError(error); } }
