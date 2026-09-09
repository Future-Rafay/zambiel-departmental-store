import { Prisma } from "@/generated/prisma/client";
import { promoDiscount, shippingFeeRappen } from "@/lib/orders";
import { prisma } from "@/server/db";
import { resolveProductMediaUrl } from "@/server/storage/s3";
import { OrderError } from "@/server/services/order-errors";
import type { QuoteInput } from "@/server/validators/order";

type Db = Prisma.TransactionClient | typeof prisma;

async function findPromo(db: Db, code?: string, email?: string, userId?: string) {
  if (!code) return null;
  const now = new Date();
  const promo = await db.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!promo || !promo.active || (promo.startsAt && promo.startsAt > now) || (promo.endsAt && promo.endsAt < now)) throw new OrderError("PROMO_INVALID");
  const [totalUses, customerUses] = await Promise.all([
    promo.totalUsageLimit === null ? Promise.resolve(0) : db.promoRedemption.count({ where: { promoCodeId: promo.id } }),
    promo.perCustomerLimit === null || !email ? Promise.resolve(0) : db.promoRedemption.count({ where: { promoCodeId: promo.id, OR: [{ customerEmail: email }, ...(userId ? [{ userId }] : [])] } }),
  ]);
  if ((promo.totalUsageLimit !== null && totalUses >= promo.totalUsageLimit) || (promo.perCustomerLimit !== null && customerUses >= promo.perCustomerLimit)) throw new OrderError("PROMO_LIMIT_REACHED");
  return promo;
}

export async function getShippingCountries(db: Db = prisma) {
  return db.deliveryZone.findMany({
    where: { active: true, countryCode: { not: null } },
    select: { countryCode: true, nameDe: true, nameEn: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
}

export async function getDeliveryQuote(countryCode: string, subtotalRappen: number, db: Db = prisma) {
  const zone = await db.deliveryZone.findUnique({ where: { countryCode } });
  if (!zone?.active) throw new OrderError("COUNTRY_NOT_DELIVERABLE");
  const remainingToMinimumRappen = Math.max(0, zone.minimumSubtotalRappen - subtotalRappen);
  return {
    zoneId: zone.id, countryCode: zone.countryCode!, nameDe: zone.nameDe, nameEn: zone.nameEn,
    deliveryFeeRappen: shippingFeeRappen(subtotalRappen, zone.feeRappen, zone.freeDeliveryThresholdRappen),
    minimumSubtotalRappen: zone.minimumSubtotalRappen, remainingToMinimumRappen,
    freeDeliveryThresholdRappen: zone.freeDeliveryThresholdRappen, estimatedMinutes: zone.estimatedMinutes,
    eligible: remainingToMinimumRappen === 0,
  };
}

export async function calculateQuote(input: QuoteInput, db: Db = prisma, userId?: string) {
  const settings = await db.fulfillmentSettings.findUniqueOrThrow({ where: { id: 1 } });
  if ((input.fulfillmentType === "DELIVERY" && !settings.deliveryEnabled) || (input.fulfillmentType === "PICKUP" && !settings.pickupEnabled)) throw new OrderError("FULFILLMENT_DISABLED");
  const quantities = new Map<string, number>();
  for (const item of input.items) quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
  const variants = await db.productVariant.findMany({
    where: { id: { in: [...quantities.keys()] }, active: true, deletedAt: null },
    include: { product: { include: { media: { orderBy: { sortOrder: "asc" }, take: 1 } } }, optionValues: { include: { optionValue: { include: { option: true } } } } },
  });
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const items = [...quantities].map(([variantId, quantity]) => {
    const variant = variantsById.get(variantId);
    if (!variant || variant.product.status !== "ACTIVE" || !variant.product.active || variant.product.deletedAt || !variant.product.available) throw new OrderError("PRODUCT_UNAVAILABLE");
    if (variant.trackInventory && variant.stockOnHand - variant.stockReserved < quantity) throw new OrderError("OUT_OF_STOCK");
    return {
      productId: variant.product.id, variantId: variant.id,
      productNameDe: variant.product.nameDe, productNameEn: variant.product.nameEn,
      variantNameDe: variant.nameDe, variantNameEn: variant.nameEn,
      imageUrl: resolveProductMediaUrl(variant.product.media[0] ?? { objectKey: variant.product.imageKey }),
      unitPriceRappen: variant.priceRappen, quantity, lineSubtotalRappen: variant.priceRappen * quantity,
      choices: variant.optionValues.map(({ optionValue }) => ({ id: null, nameDe: `${optionValue.option.name}: ${optionValue.value}`, nameEn: `${optionValue.option.name}: ${optionValue.value}`, priceDeltaRappen: 0 })),
    };
  });
  const subtotalRappen = items.reduce((sum, item) => sum + item.lineSubtotalRappen, 0);
  const delivery = input.fulfillmentType === "DELIVERY" ? await getDeliveryQuote(input.countryCode ?? "", subtotalRappen, db) : null;
  if (delivery && !delivery.eligible) throw new OrderError("DELIVERY_MINIMUM_NOT_MET");
  const promo = await findPromo(db, input.promoCode, input.customerEmail, userId);
  const discountRappen = promoDiscount(subtotalRappen, promo);
  const deliveryFeeRappen = delivery?.deliveryFeeRappen ?? 0;
  return { items, subtotalRappen, discountRappen, deliveryFeeRappen, totalRappen: Math.max(0, subtotalRappen - discountRappen) + deliveryFeeRappen, estimatedMinutes: null, promo, delivery };
}
