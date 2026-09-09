import { apiError } from "@/server/http";
import { googleLoginSchema, loginMobileCustomerWithGoogle } from "@/server/auth/customer-mobile";
import { consumePublicRateLimit, getForwardedClientIp } from "@/server/public-rate-limit";
export async function POST(request: Request) { try { const input = googleLoginSchema.parse(await request.json()); const ip = getForwardedClientIp(request.headers); if (ip && !(await consumePublicRateLimit({ scope: "mobile-google-ip", identifier: ip, limit: 10, windowMs: 15 * 60_000 })).allowed) return Response.json({ error: "RATE_LIMITED" }, { status: 429 }); return Response.json(await loginMobileCustomerWithGoogle(input)); } catch (error) { return apiError(error); } }
