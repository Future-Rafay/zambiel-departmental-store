import { z } from "zod";
import { apiError } from "@/server/http";
import { listRetailProducts } from "@/server/services/retail-catalog";

const querySchema = z.object({
  locale: z.enum(["de", "en"]).default("de"), category: z.string().max(160).optional(), query: z.string().max(160).optional(), tag: z.string().max(140).optional(),
  minPriceRappen: z.coerce.number().int().min(0).optional(), maxPriceRappen: z.coerce.number().int().min(0).optional(), availableOnly: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc", "name"]).optional(), page: z.coerce.number().int().min(1).optional(),
});
export async function GET(request: Request) { try { const value = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams)); return Response.json(await listRetailProducts({ ...value, categorySlug: value.category })); } catch (error) { return apiError(error); } }
