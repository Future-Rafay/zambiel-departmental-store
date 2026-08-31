import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "../src/server/db";

const databaseUrl = process.env.DATABASE_URL;
const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
const ownerPassword = process.env.OWNER_PASSWORD;
const ownerName = process.env.OWNER_NAME?.trim() || "Zambiel Owner";
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "");
if (!["zambiel_dev", "zambiel_test"].includes(databaseName)) throw new Error("Seed refused: DATABASE_URL must target lowercase zambiel_dev or zambiel_test.");
if (!ownerEmail) throw new Error("OWNER_EMAIL is required.");
if (!ownerPassword || ownerPassword.startsWith("replace-with")) throw new Error("OWNER_PASSWORD must be configured.");

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const categoryNames: Record<string, string> = {
  "Animals & Pet Supplies": "Tierbedarf", "Pet Supplies": "Haustierbedarf", "Pet Bowls, Feeders & Waterers": "Näpfe, Futter- und Wasserspender", "Water Dispensers": "Wasserspender",
  "Apparel & Accessories": "Bekleidung & Accessoires", Jewelry: "Schmuck", "Smart Watches": "Smartwatches", Electronics: "Elektronik", "Electronics Accessories": "Elektronikzubehör",
  Power: "Stromversorgung", "Power Control Units": "Stromsteuergeräte", "Power Strips & Surge Suppressors": "Steckdosenleisten & Überspannungsschutz", Hardware: "Haus & Technik",
  "Hardware Pumps": "Pumpen", "Utility Pumps": "Mehrzweckpumpen", "Transfer Pumps": "Transferpumpen", "Locks & Keys": "Schlösser & Schlüssel", "Locks & Latches": "Schlösser & Riegel",
  Plumbing: "Sanitär", "Plumbing Fixture Hardware & Parts": "Sanitärarmaturen & Ersatzteile", "Shower Parts": "Duschteile", "Shower Water Filters": "Duschwasserfilter",
  "Water Dispensing & Filtration": "Wasserspender & Filtration", "In-Line Water Filters": "Leitungswasserfilter", "Power & Electrical Supplies": "Elektrobedarf", "Home Automation Kits": "Hausautomatisierung",
  "Energy Management Kits": "Energiemanagement", Tools: "Werkzeuge", "Measuring Tools & Sensors": "Messgeräte & Sensoren", Gauges: "Messgeräte", "Depth Gauges": "Tiefenmessgeräte",
  "Home & Garden": "Haus & Garten", "Bathroom Accessories": "Badezimmerzubehör", "Soap & Lotion Dispensers": "Seifen- & Lotionsspender", "Kitchen & Dining": "Küche & Essen",
  "Kitchen Appliances": "Küchengeräte", "Water Coolers": "Wasserkühler", "Water Filters": "Wasserfilter", Uncategorised: "Weitere Produkte", "Vehicles & Parts": "Fahrzeuge & Teile",
  "Vehicle Parts & Accessories": "Fahrzeugteile & Zubehör", "Motor Vehicle Electronics": "Fahrzeugelektronik", "Motor Vehicle Speakers": "Autolautsprecher", "Coaxial Speakers": "Koaxiallautsprecher",
  Tweeters: "Hochtöner", "Motor Vehicle Subwoofers": "Auto-Subwoofer", "Motor Vehicle Parts": "Fahrzeugteile", "Motor Vehicle Frame & Body Parts": "Karosserieteile", Doors: "Türen",
  "Motor Vehicle Lighting": "Fahrzeugbeleuchtung", "Light Bars": "Lichtleisten", "Motor Vehicle Wheel Systems": "Radsysteme", "Motor Vehicle Tire Accessories": "Reifenzubehör",
  "Vehicle Maintenance, Care & Decor": "Fahrzeugpflege & Ausstattung", "Vehicle Decor": "Fahrzeugdekor", "Vehicle Wraps": "Fahrzeugfolien", "Vehicle Repair & Specialty Tools": "Fahrzeugreparatur & Spezialwerkzeuge",
  "Vehicle Safety & Security": "Fahrzeugsicherheit", "Vehicle Alarms & Locks": "Fahrzeugalarme & Schlösser", "Motorcycle Alarms & Locks": "Motorradalarme & Schlösser",
};
const productPhrases: Array<[RegExp, string]> = [
  [/Water Filter/gi, "Wasserfilter"], [/Water Purifier/gi, "Wasserreiniger"], [/Water Dispenser/gi, "Wasserspender"], [/Electric Pump/gi, "Elektrische Pumpe"],
  [/Power Saver/gi, "Stromspargerät"], [/Energy Saver/gi, "Energiespargerät"], [/Smart Watch/gi, "Smartwatch"], [/Snow Chains?/gi, "Schneeketten"],
  [/Anti-Skid/gi, "Rutschhemmend"], [/Car Speakers?/gi, "Autolautsprecher"], [/Car Speaker/gi, "Autolautsprecher"], [/Interior/gi, "Innenraum"],
  [/Automatic/gi, "Automatisch"], [/Portable/gi, "Tragbar"], [/Household/gi, "Haushalt"], [/Motorcycle/gi, "Motorrad"], [/Bicycle/gi, "Fahrrad"],
  [/Alarm Lock/gi, "Alarmschloss"], [/Dent Repair Tools/gi, "Dellenreparatur-Set"], [/Dent Puller/gi, "Dellenzieher"], [/Coating Thickness Gauge/gi, "Lackschicht-Messgerät"],
  [/Soap Dispenser/gi, "Seifenspender"], [/Faucet/gi, "Wasserhahn"], [/Kitchen Tap/gi, "Küchenarmatur"], [/Shower Head/gi, "Duschkopf"],
  [/Cabinet Lock/gi, "Schrankschloss"], [/Pet/gi, "Haustier"], [/Car /gi, "Auto-"], [/Vehicle/gi, "Fahrzeug"], [/Professional/gi, "Professionell"],
];
const demoGermanName = (name: string) => productPhrases.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), name).replace(/\s+/g, " ").trim();
const customers = [
  ["anna.keller@demo.zambiel.test", "Anna Keller", "+41 79 555 01 01", "8001", "Zürich"], ["luca.meier@demo.zambiel.test", "Luca Meier", "+41 79 555 01 02", "8002", "Zürich"],
  ["sara.mueller@demo.zambiel.test", "Sara Müller", "+41 79 555 01 03", "8050", "Zürich"], ["noah.frei@demo.zambiel.test", "Noah Frei", "+41 79 555 01 04", "8302", "Kloten"],
  ["mia.schmid@demo.zambiel.test", "Mia Schmid", "+41 79 555 01 05", "8152", "Opfikon"],
] as const;
const orderFixtures = [
  ["PAYMENT_PENDING", "PICKUP", "STRIPE"], ["CONFIRMED", "DELIVERY", "CASH_ON_DELIVERY"], ["PROCESSING", "PICKUP", "PAY_AT_PICKUP"],
  ["READY_FOR_PICKUP", "PICKUP", "PAY_AT_PICKUP"], ["OUT_FOR_DELIVERY", "DELIVERY", "CASH_ON_DELIVERY"], ["DELIVERED", "DELIVERY", "STRIPE"],
  ["PICKED_UP", "PICKUP", "PAY_AT_PICKUP"], ["CANCELLED", "PICKUP", "STRIPE"], ["CANCELLED", "DELIVERY", "STRIPE"], ["DELIVERED", "DELIVERY", "CASH_ON_DELIVERY"],
] as const;
const paths = {
  PAYMENT_PENDING: ["PAYMENT_PENDING"], CONFIRMED: ["CONFIRMED"], PROCESSING: ["CONFIRMED", "PROCESSING"], READY_FOR_PICKUP: ["CONFIRMED", "PROCESSING", "READY_FOR_PICKUP"],
  OUT_FOR_DELIVERY: ["CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY"], DELIVERED: ["CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED"],
  PICKED_UP: ["CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "PICKED_UP"], CANCELLED: ["PAYMENT_PENDING", "CANCELLED"],
} as const;

async function applyMovement(variantId: string, orderId: bigint, type: "ORDER_RESERVED" | "ORDER_RELEASED" | "ORDER_SOLD" | "ORDER_RESTORED", quantity: number) {
  const idempotencyKey = `demo:${orderId}:${variantId}:${type.toLowerCase()}`;
  if (await prisma.inventoryMovement.findUnique({ where: { idempotencyKey } })) return;
  await prisma.$transaction(async (tx) => {
    if (type === "ORDER_RESERVED") await tx.productVariant.update({ where: { id: variantId }, data: { stockReserved: { increment: quantity } } });
    if (type === "ORDER_RELEASED") await tx.productVariant.update({ where: { id: variantId }, data: { stockReserved: { decrement: quantity } } });
    if (type === "ORDER_SOLD") await tx.productVariant.update({ where: { id: variantId }, data: { stockOnHand: { decrement: quantity } } });
    if (type === "ORDER_RESTORED") await tx.productVariant.update({ where: { id: variantId }, data: { stockOnHand: { increment: quantity } } });
    await tx.inventoryMovement.create({ data: { variantId, orderId, type, quantityChange: type === "ORDER_RESERVED" || type === "ORDER_SOLD" ? -quantity : quantity, reason: "Deterministic Zambiel demo order", idempotencyKey } });
  });
}

async function main() {
  const owner = await prisma.user.upsert({ where: { email: ownerEmail! }, update: { name: ownerName, passwordHash: await hash(ownerPassword!, 12), role: "OWNER", active: true }, create: { email: ownerEmail!, name: ownerName, passwordHash: await hash(ownerPassword!, 12), role: "OWNER", active: true } });
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { displayName: "Zambiel", primaryColor: "#153B35", secondaryColor: "#D6A84B", heroTitleDe: "Gutes für Alltag, Zuhause und unterwegs.", heroTitleEn: "Useful goods for everyday life, home and the road.", heroSubtitleDe: "Entdecken Sie praktische Technik, Haushalt und Fahrzeugzubehör in einem klar kuratierten Sortiment.", heroSubtitleEn: "Discover practical technology, home essentials and vehicle accessories in one clearly curated range.", announcementDe: "10 % Willkommensrabatt mit WELCOME10 ab CHF 50.", announcementEn: "10% welcome discount with WELCOME10 from CHF 50.", announcementActive: true },
    create: { id: 1, slug: "zambiel", displayName: "Zambiel", primaryColor: "#153B35", secondaryColor: "#D6A84B", heroTitleDe: "Gutes für Alltag, Zuhause und unterwegs.", heroTitleEn: "Useful goods for everyday life, home and the road.", heroSubtitleDe: "Entdecken Sie praktische Technik, Haushalt und Fahrzeugzubehör in einem klar kuratierten Sortiment.", heroSubtitleEn: "Discover practical technology, home essentials and vehicle accessories in one clearly curated range.", announcementDe: "10 % Willkommensrabatt mit WELCOME10 ab CHF 50.", announcementEn: "10% welcome discount with WELCOME10 from CHF 50.", announcementActive: true },
  });
  await prisma.fulfillmentSettings.upsert({ where: { id: 1 }, update: { pickupEnabled: true, deliveryEnabled: true, lowStockDefault: 5, pickupInstructionsDe: "Demo: Die Abholadresse wird vor dem Produktionsstart ergänzt.", pickupInstructionsEn: "Demo: The pickup address will be added before production launch." }, create: { id: 1, pickupEnabled: true, deliveryEnabled: true, lowStockDefault: 5, pickupInstructionsDe: "Demo: Die Abholadresse wird vor dem Produktionsstart ergänzt.", pickupInstructionsEn: "Demo: The pickup address will be added before production launch." } });
  const zones = await Promise.all([
    prisma.deliveryZone.upsert({ where: { id: "demo-zone-zurich" }, update: { active: true }, create: { id: "demo-zone-zurich", nameDe: "Demo Zürich Stadt", nameEn: "Demo Zurich City", feeRappen: 790, minimumSubtotalRappen: 3500, freeDeliveryThresholdRappen: 12000, estimatedMinutes: 60, sortOrder: 0 } }),
    prisma.deliveryZone.upsert({ where: { id: "demo-zone-glattal" }, update: { active: true }, create: { id: "demo-zone-glattal", nameDe: "Demo Glattal", nameEn: "Demo Glatt Valley", feeRappen: 990, minimumSubtotalRappen: 5000, freeDeliveryThresholdRappen: 15000, estimatedMinutes: 90, sortOrder: 1 } }),
  ]);
  for (const [postalCode, zone] of [["8001", zones[0]], ["8002", zones[0]], ["8050", zones[0]], ["8302", zones[1]], ["8152", zones[1]]] as const) await prisma.deliveryZonePostalCode.upsert({ where: { postalCode }, update: { deliveryZoneId: zone.id }, create: { postalCode, deliveryZoneId: zone.id } });
  const promo = await prisma.promoCode.upsert({ where: { code: "WELCOME10" }, update: { type: "PERCENT", value: 1000, minimumSubtotalRappen: 5000, perCustomerLimit: 1, totalUsageLimit: 500, startsAt: null, endsAt: null, active: true }, create: { code: "WELCOME10", type: "PERCENT", value: 1000, minimumSubtotalRappen: 5000, perCustomerLimit: 1, totalUsageLimit: 500, active: true } });

  for (const category of await prisma.category.findMany()) {
    const nameDe = categoryNames[category.nameEn] ?? category.nameEn;
    await prisma.category.update({ where: { id: category.id }, data: { nameDe, descriptionDe: `${nameDe} für einen gut organisierten Alltag.`, descriptionEn: category.descriptionEn || `${category.nameEn} selected for practical everyday use.`, seoTitleDe: nameDe, seoTitleEn: category.seoTitleEn || category.nameEn, active: true } });
  }
  const products = await prisma.product.findMany({ where: { sourceHandle: { not: null } }, include: { media: { orderBy: { sortOrder: "asc" }, take: 1 }, variants: true }, orderBy: { slug: "asc" } });
  for (const [index, product] of products.entries()) {
    const nameDe = demoGermanName(product.nameEn);
    await prisma.product.update({ where: { id: product.id }, data: { nameDe, descriptionDe: `<p>${nameDe} für praktische Anwendungen im Alltag.</p><p>Wählen Sie die passende Variante und prüfen Sie Verfügbarkeit und Preis direkt im Shop.</p>`, seoTitleDe: nameDe, seoDescriptionDe: `${nameDe} bei Zambiel entdecken. Varianten, Preise und Verfügbarkeit direkt vergleichen.`, imageKey: product.media[0]?.sourceUrl ?? product.imageKey, status: "ACTIVE", active: true, available: true, featured: index < 8, sortOrder: index, publishedAt: new Date(Date.UTC(2026, 7, 1 + index)), media: { updateMany: { where: {}, data: { altDe: nameDe, altEn: product.nameEn } } } } });
    for (const variant of product.variants) await prisma.productVariant.update({ where: { id: variant.id }, data: { nameDe: demoGermanName(variant.nameEn || nameDe), active: true, deletedAt: null } });
  }

  const customerUsers = [];
  for (const [email, name, phone, postalCode, city] of customers) {
    const user = await prisma.user.upsert({ where: { email }, update: { name, phone, role: "CUSTOMER", active: true }, create: { email, name, phone, role: "CUSTOMER", active: true, emailVerified: new Date("2026-08-01T09:00:00.000Z") } });
    await prisma.customerAddress.upsert({ where: { userId: user.id }, update: { recipientName: name, phone, street: "Demostrasse 1", postalCode, city, countryCode: "CH", isDefault: true }, create: { userId: user.id, label: "Zuhause", recipientName: name, phone, street: "Demostrasse 1", postalCode, city, countryCode: "CH", isDefault: true } });
    customerUsers.push({ user, postalCode, city, phone });
  }
  const variants = await prisma.productVariant.findMany({ where: { active: true, deletedAt: null, product: { status: "ACTIVE" } }, include: { product: true, optionValues: { include: { optionValue: { include: { option: true } } } } }, orderBy: { sku: "asc" }, take: 12 });
  if (!variants.length) return;
  for (const [index, [status, fulfillmentType, paymentMethod]] of orderFixtures.entries()) {
    const customer = customerUsers[index % customerUsers.length];
    const variant = index === 9 ? (await prisma.productVariant.findFirst({ where: { active: true, priceRappen: { gte: 5000 }, product: { status: "ACTIVE" } }, include: { product: true, optionValues: { include: { optionValue: { include: { option: true } } } } } })) ?? variants[index % variants.length] : variants[index % variants.length];
    const quantity = 1, subtotalRappen = variant.priceRappen, discountRappen = index === 9 ? Math.round(subtotalRappen * 0.1) : 0, deliveryFeeRappen = fulfillmentType === "DELIVERY" ? (index % 2 ? 990 : 790) : 0, totalRappen = subtotalRappen - discountRappen + deliveryFeeRappen;
    const createdAt = new Date(Date.UTC(2026, 7, 10 + index, 9 + index)), path = paths[status];
    const paymentStatus = status === "PAYMENT_PENDING" ? "PENDING" : index === 7 ? "FAILED" : index === 8 ? "REFUNDED" : ["DELIVERED", "PICKED_UP"].includes(status) ? "PAID" : "PENDING";
    const order = await prisma.order.upsert({
      where: { checkoutKeyHash: digest(`zambiel-demo-order-${index + 1}`) }, update: {},
      create: { checkoutKeyHash: digest(`zambiel-demo-order-${index + 1}`), userId: customer.user.id, locale: index % 3 === 0 ? "EN" : "DE", customerName: customer.user.name || "Demo Customer", customerEmail: customer.user.email, customerPhone: customer.phone, fulfillmentType, status, paymentMethod, note: "Deterministic local demo order", subtotalRappen, discountRappen, deliveryFeeRappen, totalRappen, promoCodeId: index === 9 ? promo.id : null, deliveryZoneId: fulfillmentType === "DELIVERY" ? (index % 2 ? zones[1].id : zones[0].id) : null, deliveryZoneNameDeSnapshot: fulfillmentType === "DELIVERY" ? (index % 2 ? zones[1].nameDe : zones[0].nameDe) : null, deliveryZoneNameEnSnapshot: fulfillmentType === "DELIVERY" ? (index % 2 ? zones[1].nameEn : zones[0].nameEn) : null, version: Math.max(0, path.length - 1), completedAt: ["DELIVERED", "PICKED_UP"].includes(status) ? new Date(createdAt.getTime() + 3_600_000) : null, cancelledAt: status === "CANCELLED" ? new Date(createdAt.getTime() + 1_800_000) : null, cancellationReason: status === "CANCELLED" ? (index === 8 ? "Demo refund and cancellation" : "Demo payment expired") : null, createdAt,
        address: fulfillmentType === "DELIVERY" ? { create: { recipientName: customer.user.name || "Demo Customer", phone: customer.phone, street: "Demostrasse 1", postalCode: customer.postalCode, city: customer.city, countryCode: "CH" } } : undefined,
        items: { create: { productId: variant.productId, variantId: variant.id, productNameDeSnapshot: variant.product.nameDe, productNameEnSnapshot: variant.product.nameEn, variantNameDeSnapshot: variant.nameDe, variantNameEnSnapshot: variant.nameEn, unitPriceRappen: variant.priceRappen, quantity, lineSubtotalRappen: subtotalRappen, options: { create: variant.optionValues.map(({ optionValue }) => ({ nameDeSnapshot: `${optionValue.option.name}: ${optionValue.value}`, nameEnSnapshot: `${optionValue.option.name}: ${optionValue.value}`, priceDeltaRappen: 0 })) } } },
        statusEvents: { create: path.map((toStatus, step) => ({ actorUserId: owner.id, fromStatus: step ? path[step - 1] : null, toStatus, reason: step ? "DEMO_STATUS_ADVANCED" : "ORDER_CREATED", createdAt: new Date(createdAt.getTime() + step * 900_000) })) },
        payment: { create: { provider: paymentMethod === "STRIPE" ? "STRIPE" : "CASH", status: paymentStatus, stripeCheckoutSessionId: paymentMethod === "STRIPE" ? `cs_demo_zambiel_${index + 1}` : null, stripePaymentIntentId: paymentMethod === "STRIPE" && paymentStatus !== "PENDING" && paymentStatus !== "FAILED" ? `pi_demo_zambiel_${index + 1}` : null, amountRappen: totalRappen, refundedRappen: index === 8 ? totalRappen : 0, paidAt: ["PAID", "REFUNDED"].includes(paymentStatus) ? new Date(createdAt.getTime() + 600_000) : null, failedAt: paymentStatus === "FAILED" ? new Date(createdAt.getTime() + 600_000) : null } },
        promoRedemption: index === 9 ? { create: { promoCodeId: promo.id, userId: customer.user.id, customerEmail: customer.user.email, discountRappen } } : undefined,
      }, include: { payment: true },
    });
    if (paymentMethod === "STRIPE" && status === "PAYMENT_PENDING") await applyMovement(variant.id, order.id, "ORDER_RESERVED", quantity);
    else if (paymentMethod === "STRIPE" && index === 7) { await applyMovement(variant.id, order.id, "ORDER_RESERVED", quantity); await applyMovement(variant.id, order.id, "ORDER_RELEASED", quantity); }
    else if (paymentMethod === "STRIPE" && index === 8) { await applyMovement(variant.id, order.id, "ORDER_SOLD", quantity); await applyMovement(variant.id, order.id, "ORDER_RESTORED", quantity); }
    else await applyMovement(variant.id, order.id, "ORDER_SOLD", quantity);
    if (index === 8 && order.payment) await prisma.refund.upsert({ where: { stripeRefundId: "re_demo_zambiel_9" }, update: {}, create: { paymentId: order.payment.id, requestedByUserId: owner.id, stripeRefundId: "re_demo_zambiel_9", amountRappen: totalRappen, reason: "Deterministic demo refund", status: "SUCCEEDED" } });
    await prisma.notificationDelivery.upsert({ where: { deduplicationKey: `demo:order:${order.id}:email` }, update: {}, create: { orderId: order.id, channel: "EMAIL", kind: "order-status-demo", recipient: customer.user.email, deduplicationKey: `demo:order:${order.id}:email`, status: index === 7 ? "FAILED" : "SENT", attemptCount: 1, providerId: index === 7 ? null : `demo-email-${index + 1}`, lastError: index === 7 ? "Intentional demo provider failure" : null, sentAt: index === 7 ? null : createdAt } });
    const correlation = `demo-seed-order-${index + 1}`;
    if (!await prisma.auditLog.findFirst({ where: { requestCorrelationId: correlation } })) await prisma.auditLog.create({ data: { actorUserId: owner.id, action: "DEMO_ORDER_SEEDED", entityType: "Order", entityId: order.id.toString(), metadata: { status, paymentMethod }, requestCorrelationId: correlation, createdAt } });
  }
}

main().finally(() => prisma.$disconnect());
