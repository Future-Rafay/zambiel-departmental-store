import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";

test("catalogue filtering pages IDs before loading product graphs", async (context) => {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl || testDatabaseUrl === process.env.DATABASE_URL) {
    context.skip("TEST_DATABASE_URL must point to a migrated isolated database.");
    return;
  }

  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DATABASE_CONNECTION_LIMIT = "2";
  process.env.DATABASE_SSL ??= "false";

  const [{ prisma }, { listRetailProducts }] = await Promise.all([
    import("@/server/db"),
    import("@/server/services/retail-catalog"),
  ]);
  const suffix = crypto.randomUUID();
  const rootId = `catalog-root-${suffix}`;
  const childId = `catalog-child-${suffix}`;
  const tagId = `catalog-tag-${suffix}`;
  const productIds = Array.from({ length: 26 }, (_, index) => `catalog-product-${String(index).padStart(2, "0")}-${suffix}`);

  try {
    await prisma.category.create({ data: { id: rootId, slug: `catalog-root-${suffix}`, nameDe: "Test", nameEn: "Test" } });
    await prisma.category.create({ data: { id: childId, parentId: rootId, slug: `catalog-child-${suffix}`, nameDe: "Child", nameEn: "Child" } });
    await prisma.product.createMany({ data: productIds.map((id, index) => ({
      id,
      categoryId: childId,
      slug: `catalog-product-${index}-${suffix}`,
      sourceHandle: `catalog-test-${index}-${suffix}`,
      nameDe: `Produkt ${String(index).padStart(2, "0")}`,
      nameEn: `Product ${String(index).padStart(2, "0")}`,
      status: "ACTIVE",
      active: true,
      available: index !== 1,
      featured: index < 2,
      sortOrder: index,
      publishedAt: new Date(Date.UTC(2026, 0, index + 1)),
    })) });
    await prisma.productVariant.createMany({ data: productIds.map((productId, index) => ({
      id: `catalog-variant-${index}-${suffix}`,
      productId,
      nameDe: "Standard",
      nameEn: "Default",
      sku: `CATALOG-${index}-${suffix}`,
      priceRappen: index < 2 ? 1_000 : 1_000 + index * 100,
      stockOnHand: index === 0 ? 1 : 10,
      stockReserved: index === 0 ? 1 : 0,
      trackInventory: true,
    })) });
    await prisma.productTag.create({ data: { id: tagId, name: "Featured test", slug: `catalog-tag-${suffix}`, products: { connect: { id: productIds[2] } } } });

    const first = await listRetailProducts({ locale: "en", categorySlug: `catalog-root-${suffix}`, sort: "price-asc" });
    assert.equal(first.total, 26);
    assert.equal(first.pageCount, 2);
    assert.equal(first.items.length, 24);
    assert.deepEqual(first.items.slice(0, 2).map(({ id }) => id), productIds.slice(0, 2));
    assert.equal(first.items[0].imageUrl, null);

    const second = await listRetailProducts({ locale: "en", categorySlug: `catalog-root-${suffix}`, sort: "price-asc", page: 2 });
    assert.deepEqual(second.items.map(({ id }) => id), productIds.slice(24));
    assert.equal((await listRetailProducts({ locale: "en", categorySlug: `catalog-root-${suffix}`, availableOnly: true })).total, 24);
    assert.equal((await listRetailProducts({ locale: "en", minPriceRappen: 2_000, maxPriceRappen: 2_500 })).total, 6);
    assert.equal((await listRetailProducts({ locale: "en", query: `CATALOG-7-${suffix}` })).items[0]?.id, productIds[7]);
    assert.equal((await listRetailProducts({ locale: "en", tag: `catalog-tag-${suffix}` })).items[0]?.id, productIds[2]);
  } finally {
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.productTag.deleteMany({ where: { id: tagId } });
    await prisma.category.deleteMany({ where: { id: childId } });
    await prisma.category.deleteMany({ where: { id: rootId } });
    await prisma.$disconnect();
  }
});
