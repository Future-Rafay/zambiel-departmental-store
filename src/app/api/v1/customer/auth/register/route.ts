import { apiError } from "@/server/http";
import { mobileRegistrationSchema, registerMobileCustomer } from "@/server/auth/customer-mobile";
import { consumePublicRateLimit, getForwardedClientIp } from "@/server/public-rate-limit";
export async function POST(request: Request) { try { const input = mobileRegistrationSchema.parse(await request.json()); const ip = getForwardedClientIp(request.headers); if (ip && !(await consumePublicRateLimit({ scope: "mobile-register-ip", identifier: ip, limit: 5, windowMs: 60 * 60_000 })).allowed) return Response.json({ error: "RATE_LIMITED" }, { status: 429 }); return Response.json(await registerMobileCustomer(input), { status: 201 }); } catch (error) { return apiError(error); } }
