import { z } from "zod";
import { apiError } from "@/server/http";
import { getRetailHomepage } from "@/server/services/retail-catalog";
export async function GET(request: Request) { try { const locale = z.enum(["de", "en"]).catch("de").parse(new URL(request.url).searchParams.get("locale")); return Response.json(await getRetailHomepage(locale)); } catch (error) { return apiError(error); } }
