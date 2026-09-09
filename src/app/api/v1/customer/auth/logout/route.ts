import { logoutMobileCustomer } from "@/server/auth/customer-mobile";
import { apiError } from "@/server/http";
export async function POST(request: Request) { try { await logoutMobileCustomer(request); return new Response(null, { status: 204 }); } catch (error) { return apiError(error); } }
