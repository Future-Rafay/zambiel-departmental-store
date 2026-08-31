import "dotenv/config";

import { prisma } from "../src/server/db";

async function main() {
  const [products, variants, media, drafts, stock, openingMovements, activeCategories, activeProducts, activeVariants, sourceMedia, customers, orders, zones, welcomePromos, refunds, notifications, audits, demoMovements] =
    await Promise.all([
      prisma.product.count({ where: { sourceHandle: { not: null } } }),
      prisma.productVariant.count({
        where: { product: { sourceHandle: { not: null } } },
      }),
      prisma.productMedia.count({
        where: { product: { sourceHandle: { not: null } } },
      }),
      prisma.product.count({
        where: { sourceHandle: { not: null }, status: "DRAFT" },
      }),
      prisma.productVariant.aggregate({
        where: { product: { sourceHandle: { not: null } } },
        _sum: { stockOnHand: true, stockReserved: true },
      }),
      prisma.inventoryMovement.count({ where: { type: "OPENING_STOCK" } }),
      prisma.category.count({ where: { active: true } }),
      prisma.product.count({ where: { active: true, status: "ACTIVE" } }),
      prisma.productVariant.count({ where: { active: true } }),
      prisma.productMedia.count({ where: { sourceUrl: { not: null } } }),
      prisma.user.count({ where: { email: { endsWith: "@demo.zambiel.test" } } }),
      prisma.order.count({ where: { note: "Deterministic local demo order" } }),
      prisma.deliveryZone.count({ where: { id: { startsWith: "demo-zone-" } } }),
      prisma.promoCode.count({ where: { code: "WELCOME10", active: true, value: 1000 } }),
      prisma.refund.count({ where: { stripeRefundId: "re_demo_zambiel_9" } }),
      prisma.notificationDelivery.count({ where: { kind: "order-status-demo" } }),
      prisma.auditLog.count({ where: { action: "DEMO_ORDER_SEEDED" } }),
      prisma.inventoryMovement.count({ where: { idempotencyKey: { startsWith: "demo:" } } }),
    ]);

  const imageCheck = process.argv.includes("--check-images") ? await checkSourceImages() : undefined;
  console.log(
    JSON.stringify(
      {
        products,
        variants,
        media,
        drafts,
        stock: stock._sum,
        openingMovements,
        active: { categories: activeCategories, products: activeProducts, variants: activeVariants },
        sourceMedia,
        demo: { customers, orders, zones, welcomePromos, refunds, notifications, audits, movements: demoMovements },
        imageCheck,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

async function checkSourceImages() {
  const rows = await prisma.productMedia.findMany({ where: { sourceUrl: { not: null } }, select: { sourceUrl: true } });
  const urls = [...new Set(rows.flatMap(({ sourceUrl }) => sourceUrl ? [sourceUrl] : []))];
  const failed: Array<{ url: string; status: number | "error" }> = [];
  for (let offset = 0; offset < urls.length; offset += 16) {
    const results = await Promise.all(urls.slice(offset, offset + 16).map(async (url) => {
      try { const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10_000) }); return response.ok ? null : { url, status: response.status }; }
      catch { return { url, status: "error" as const }; }
    }));
    failed.push(...results.filter((result): result is NonNullable<typeof result> => Boolean(result)));
  }
  return { checked: urls.length, failed };
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
