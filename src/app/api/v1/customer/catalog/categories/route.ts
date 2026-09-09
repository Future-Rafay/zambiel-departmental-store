import { z } from "zod";
import { getRetailCategories } from "@/server/services/retail-catalog";
export async function GET(request: Request) { const locale = z.enum(["de", "en"]).catch("de").parse(new URL(request.url).searchParams.get("locale")); return Response.json({ categories: await getRetailCategories(locale) }); }
