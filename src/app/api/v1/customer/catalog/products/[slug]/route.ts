import { z } from "zod";
import { getRetailProduct, getRetailRelatedProducts } from "@/server/services/retail-catalog";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) { const locale = z.enum(["de", "en"]).catch("de").parse(new URL(request.url).searchParams.get("locale")); const product = await getRetailProduct((await params).slug, locale); if (!product) return Response.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 }); return Response.json({ product, related: await getRetailRelatedProducts(product.id, product.category.id, locale) }); }
