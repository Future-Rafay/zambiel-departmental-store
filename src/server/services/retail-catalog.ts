import { randomInt } from "node:crypto";
import { cache } from "react";

import { Prisma } from "@/generated/prisma/client";
import { categoryProductTotals } from "@/lib/catalog-display";
import { prisma } from "@/server/db";
import { resolveProductMediaUrl, resolvePublicImageUrl } from "@/server/storage/s3";
import type { StoreLocale } from "@/config/store";

const retailProductInclude = {
  category: true,
  media: { orderBy: { sortOrder: "asc" as const } },
  tags: { orderBy: { name: "asc" as const } },
  productOptions: { orderBy: { sortOrder: "asc" as const }, include: { values: { orderBy: { sortOrder: "asc" as const } } } },
  variants: {
    where: { active: true, deletedAt: null },
    orderBy: { sortOrder: "asc" as const },
    include: { optionValues: { include: { optionValue: { include: { option: true } } } }, media: { orderBy: { sortOrder: "asc" as const } } },
  },
} satisfies Prisma.ProductInclude;

type RetailProduct = Prisma.ProductGetPayload<{ include: typeof retailProductInclude }>;

function local(locale: StoreLocale, de: string | null | undefined, en: string | null | undefined) {
  return locale === "de" ? de || en || "" : en || de || "";
}

function shuffle<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

export function retailProductDto(product: RetailProduct, locale: StoreLocale) {
  const variants = product.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    name: local(locale, variant.nameDe, variant.nameEn),
    priceRappen: variant.priceRappen,
    compareAtPriceRappen: variant.compareAtPriceRappen,
    stockAvailable: variant.trackInventory ? Math.max(0, variant.stockOnHand - variant.stockReserved) : null,
    imageUrl: resolveProductMediaUrl(variant.media[0] ?? product.media[0] ?? { objectKey: product.imageKey }),
    optionValues: variant.optionValues.map(({ optionValue }) => ({ optionId: optionValue.optionId, optionName: optionValue.option.name, valueId: optionValue.id, value: optionValue.value })),
  }));
  const prices = variants.map(({ priceRappen }) => priceRappen);
  return {
    id: product.id,
    slug: product.slug,
    name: local(locale, product.nameDe, product.nameEn),
    description: local(locale, product.descriptionDe, product.descriptionEn),
    seoTitle: local(locale, product.seoTitleDe, product.seoTitleEn),
    seoDescription: local(locale, product.seoDescriptionDe, product.seoDescriptionEn),
    category: { id: product.category.id, slug: product.category.slug, name: local(locale, product.category.nameDe, product.category.nameEn) },
    featured: product.featured,
    imageUrl: resolveProductMediaUrl(product.media[0] ?? { objectKey: product.imageKey }),
    media: product.media.map((media) => ({ id: media.id, url: resolveProductMediaUrl(media), alt: local(locale, media.altDe, media.altEn) || local(locale, product.nameDe, product.nameEn) })),
    tags: product.tags.map(({ name, slug }) => ({ name, slug })),
    options: product.productOptions.map((option) => ({ id: option.id, name: option.name, values: option.values.map(({ id, value }) => ({ id, value })) })),
    variants,
    minimumPriceRappen: prices.length ? Math.min(...prices) : 0,
    maximumPriceRappen: prices.length ? Math.max(...prices) : 0,
    available: product.available && variants.some((variant) => variant.stockAvailable === null || variant.stockAvailable > 0),
  };
}

export const getRetailCategories = cache(async (locale: StoreLocale) => {
  const categories = await prisma.category.findMany({
    where: { active: true, deletedAt: null },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { nameEn: "asc" }],
    include: { _count: { select: { products: { where: { status: "ACTIVE", active: true, deletedAt: null } } } } },
  });
  const totals = categoryProductTotals(categories.map((category) => ({
    id: category.id,
    parentId: category.parentId,
    productCount: category._count.products,
  })));
  return categories.map((category) => ({
    id: category.id,
    parentId: category.parentId,
    slug: category.slug,
    name: local(locale, category.nameDe, category.nameEn),
    description: local(locale, category.descriptionDe, category.descriptionEn),
    imageUrl: resolvePublicImageUrl(category.imageKey),
    productCount: totals.get(category.id) ?? category._count.products,
  }));
});

export async function listRetailProducts(input: {
  locale: StoreLocale;
  categorySlug?: string;
  query?: string;
  tag?: string;
  minPriceRappen?: number;
  maxPriceRappen?: number;
  availableOnly?: boolean;
  sort?: "featured" | "newest" | "price-asc" | "price-desc" | "name";
  page?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const take = 24;
  const query = input.query?.trim();
  let categoryIds: string[] | undefined;
  if (input.categorySlug) {
    const categories = await prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, slug: true, parentId: true } });
    const root = categories.find((category) => category.slug === input.categorySlug);
    if (root) {
      categoryIds = [root.id];
      const seen = new Set(categoryIds);
      for (let index = 0; index < categoryIds.length; index += 1) {
        for (const child of categories.filter((category) => category.parentId === categoryIds![index])) if (!seen.has(child.id)) { seen.add(child.id); categoryIds.push(child.id); }
      }
    } else categoryIds = [];
  }
  if (categoryIds?.length === 0) return { items: [], page, pageCount: 1, total: 0 };

  const variantFilters = [Prisma.sql`matchingVariant.active = 1`, Prisma.sql`matchingVariant.deletedAt IS NULL`];
  if (input.minPriceRappen !== undefined) variantFilters.push(Prisma.sql`matchingVariant.priceRappen >= ${input.minPriceRappen}`);
  if (input.maxPriceRappen !== undefined) variantFilters.push(Prisma.sql`matchingVariant.priceRappen <= ${input.maxPriceRappen}`);
  const filters = [
    Prisma.sql`p.status = 'ACTIVE'`,
    Prisma.sql`p.active = 1`,
    Prisma.sql`p.deletedAt IS NULL`,
    Prisma.sql`EXISTS (
      SELECT 1 FROM productvariant matchingVariant
      WHERE matchingVariant.productId = p.id AND ${Prisma.join(variantFilters, " AND ")}
    )`,
  ];
  if (categoryIds) filters.push(Prisma.sql`p.categoryId IN (${Prisma.join(categoryIds)})`);
  if (query) {
    const pattern = `%${query}%`;
    filters.push(Prisma.sql`(
      p.nameDe LIKE ${pattern} OR p.nameEn LIKE ${pattern} OR EXISTS (
        SELECT 1 FROM productvariant searchVariant
        WHERE searchVariant.productId = p.id AND searchVariant.sku LIKE ${pattern}
      )
    )`);
  }
  if (input.tag) filters.push(Prisma.sql`EXISTS (
    SELECT 1 FROM \`_ProductToProductTag\` productTags
    JOIN producttag tag ON tag.id = productTags.B
    WHERE productTags.A = p.id AND tag.slug = ${input.tag}
  )`);
  if (input.availableOnly) filters.push(Prisma.sql`p.available = 1 AND EXISTS (
    SELECT 1 FROM productvariant availableVariant
    WHERE availableVariant.productId = p.id
      AND availableVariant.active = 1
      AND availableVariant.deletedAt IS NULL
      AND (availableVariant.trackInventory = 0 OR availableVariant.stockOnHand - availableVariant.stockReserved > 0)
  )`);

  const whereSql = Prisma.sql`${Prisma.join(filters, " AND ")}`;
  const orderSql = input.sort === "price-asc"
    ? Prisma.sql`minimumPriceRappen ASC, p.id ASC`
    : input.sort === "price-desc"
      ? Prisma.sql`minimumPriceRappen DESC, p.id ASC`
      : input.sort === "name"
        ? input.locale === "de" ? Prisma.sql`p.nameDe ASC, p.id ASC` : Prisma.sql`p.nameEn ASC, p.id ASC`
        : input.sort === "newest"
          ? Prisma.sql`p.publishedAt DESC, p.id DESC`
          : Prisma.sql`p.featured DESC, p.sortOrder ASC, p.id ASC`;
  const [countRows, pageRows] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*) AS total FROM product p WHERE ${whereSql}`),
    prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT p.id, MIN(v.priceRappen) AS minimumPriceRappen
      FROM product p
      JOIN productvariant v ON v.productId = p.id AND v.active = 1 AND v.deletedAt IS NULL
      WHERE ${whereSql}
      GROUP BY p.id
      ORDER BY ${orderSql}
      LIMIT ${take} OFFSET ${(page - 1) * take}
    `),
  ]);
  const ids = pageRows.map(({ id }) => id);
  const products = ids.length
    ? await prisma.product.findMany({ where: { id: { in: ids } }, include: retailProductInclude })
    : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  const items = ids.flatMap((id) => byId.has(id) ? [retailProductDto(byId.get(id)!, input.locale)] : []);
  const total = Number(countRows[0]?.total ?? 0);
  return { items, page, pageCount: Math.max(1, Math.ceil(total / take)), total };
}

export async function getRetailProduct(slug: string, locale: StoreLocale) {
  const product = await prisma.product.findFirst({ where: { slug, status: "ACTIVE", active: true, deletedAt: null }, include: retailProductInclude });
  return product ? retailProductDto(product, locale) : null;
}

export async function getRetailRelatedProducts(productId: string, categoryId: string, locale: StoreLocale) {
  const products = await prisma.product.findMany({
    where: { id: { not: productId }, categoryId, status: "ACTIVE", active: true, deletedAt: null },
    include: retailProductInclude,
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
    take: 4,
  });
  return products.map((product) => retailProductDto(product, locale));
}

export async function getRetailProductsBySlugs(slugs: string[], locale: StoreLocale) {
  if (!slugs.length) return [];
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, status: "ACTIVE", active: true, deletedAt: null },
    include: retailProductInclude,
  });
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return slugs.flatMap((slug) => bySlug.has(slug) ? [retailProductDto(bySlug.get(slug)!, locale)] : []);
}

export async function getRetailHomepage(locale: StoreLocale) {
  const now = new Date();
  const [categories, showcase, featured, newest, bestSellerGroups, promotions] = await Promise.all([
    getRetailCategories(locale),
    prisma.product.findMany({ where: { status: "ACTIVE", active: true, deletedAt: null }, include: retailProductInclude, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { id: "asc" }], take: 12 }),
    prisma.product.findMany({ where: { status: "ACTIVE", active: true, deletedAt: null, featured: true }, include: retailProductInclude, orderBy: { sortOrder: "asc" }, take: 8 }),
    prisma.product.findMany({ where: { status: "ACTIVE", active: true, deletedAt: null }, include: retailProductInclude, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: 8 }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null }, order: { status: { in: ["DELIVERED", "PICKED_UP"] } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    }),
    prisma.promoCode.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      select: { id: true, code: true, type: true, value: true, minimumSubtotalRappen: true, endsAt: true },
      orderBy: [{ endsAt: "asc" }, { createdAt: "desc" }],
      take: 4,
    }),
  ]);
  const bestIds = bestSellerGroups.flatMap(({ productId }) => productId ? [productId] : []);
  const bestProducts = bestIds.length
    ? await prisma.product.findMany({ where: { id: { in: bestIds }, status: "ACTIVE" }, include: retailProductInclude })
    : [];
  const byId = new Map(bestProducts.map((product) => [product.id, product]));
  return {
    categories: categories.filter(({ parentId }) => !parentId).slice(0, 8),
    showcase: shuffle(showcase.map((product) => retailProductDto(product, locale))),
    featured: featured.map((product) => retailProductDto(product, locale)),
    newest: newest.map((product) => retailProductDto(product, locale)),
    bestSellers: bestIds.flatMap((id) => byId.get(id) ? [retailProductDto(byId.get(id)!, locale)] : []),
    promotions,
  };
}
