import { z } from "zod";
import { requireCustomerApiUser } from "@/server/auth/customer-mobile";
import { prisma } from "@/server/db";
import { apiError } from "@/server/http";
import { getRetailProductsBySlugs } from "@/server/services/retail-catalog";

export async function GET(request: Request) { try { const user = await requireCustomerApiUser(request); const locale = z.enum(["de", "en"]).catch("de").parse(new URL(request.url).searchParams.get("locale")); const saved = await prisma.customerWishlist.findMany({ where: { userId: user.id }, include: { product: { select: { slug: true } } }, orderBy: { createdAt: "desc" } }); return Response.json({ products: await getRetailProductsBySlugs(saved.map(({ product }) => product.slug), locale) }); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { const user = await requireCustomerApiUser(request); const { productId } = z.object({ productId: z.string().min(1).max(191) }).parse(await request.json()); const product = await prisma.product.findFirst({ where: { id: productId, status: "ACTIVE", active: true, deletedAt: null }, select: { id: true } }); if (!product) return Response.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 }); await prisma.customerWishlist.upsert({ where: { userId_productId: { userId: user.id, productId } }, create: { userId: user.id, productId }, update: {} }); return new Response(null, { status: 204 }); } catch (error) { return apiError(error); } }
