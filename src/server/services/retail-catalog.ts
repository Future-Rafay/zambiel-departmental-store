import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
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
    category: { slug: product.category.slug, name: local(locale, product.category.nameDe, product.category.nameEn) },
    featured: product.featured,
    imageUrl: resolveProductMediaUrl(product.media[0] ?? { objectKey: product.imageKey }),
    media: product.media.map((media) => ({ id: media.id, url: resolveProductMediaUrl(media), alt: local(locale, media.altDe, media.altEn) || local(locale, product.nameDe, product.nameEn) })),
    tags: product.tags.map(({ name, slug }) => ({ name, slug })),
    options: product.productOptions.map((option) => ({ id: option.id, name: option.name, values: option.values.map(({ id, value }) => ({ id, value })) })),
    variants,
    minimumPriceRappen: prices.length ? Math.min(...prices) : 0,
    maximumPriceRappen: prices.length ? Math.max(...prices) : 0,
    available: variants.some((variant) => variant.stockAvailable === null || variant.stockAvailable > 0),
  };
}

export const getRetailCategories = cache(async (locale: StoreLocale) => {
  const categories = await prisma.category.findMany({
    where: { active: true, deletedAt: null },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { nameEn: "asc" }],
    include: { _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } } },
  });
  return categories.map((category) => ({
    id: category.id,
    parentId: category.parentId,
    slug: category.slug,
    name: local(locale, category.nameDe, category.nameEn),
    description: local(locale, category.descriptionDe, category.descriptionEn),
    imageUrl: resolvePublicImageUrl(category.imageKey),
    productCount: category._count.products,
  }));
});

export async function listRetailProducts(input: {
  locale: StoreLocale;
  categorySlug?: string;
  query?: string;
  tag?: string;
  options?: Array<{ optionId: string; valueId: string }>;
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
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    active: true,
    deletedAt: null,
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(query ? { OR: [{ nameDe: { contains: query } }, { nameEn: { contains: query } }, { variants: { some: { sku: { contains: query } } } }] } : {}),
    ...(input.tag ? { tags: { some: { slug: input.tag } } } : {}),
    variants: {
      some: {
        active: true,
        deletedAt: null,
        ...(input.minPriceRappen !== undefined ? { priceRappen: { gte: input.minPriceRappen } } : {}),
        ...(input.maxPriceRappen !== undefined ? { priceRappen: { lte: input.maxPriceRappen } } : {}),
        ...(input.options?.length ? {
          AND: input.options.map(({ optionId, valueId }) => ({
            optionValues: { some: { optionValueId: valueId, optionValue: { optionId } } },
          })),
        } : {}),
      },
    },
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] = input.sort === "name"
    ? [{ nameDe: "asc" }, { id: "asc" }]
    : input.sort === "newest"
      ? [{ publishedAt: "desc" }, { id: "desc" }]
      : [{ featured: "desc" }, { sortOrder: "asc" }, { id: "asc" }];
  const postFilter = input.availableOnly || input.sort === "price-asc" || input.sort === "price-desc";
  const [products, databaseTotal] = await Promise.all([
    prisma.product.findMany({ where, include: retailProductInclude, orderBy, ...(postFilter ? {} : { skip: (page - 1) * take, take }) }),
    postFilter ? Promise.resolve(0) : prisma.product.count({ where }),
  ]);
  let items = products.map((product) => retailProductDto(product, input.locale));
  if (input.availableOnly) items = items.filter(({ available }) => available);
  if (input.sort === "price-asc" || input.sort === "price-desc") {
    items.sort((a, b) => (a.minimumPriceRappen - b.minimumPriceRappen) * (input.sort === "price-desc" ? -1 : 1));
  }
  const total = postFilter ? items.length : databaseTotal;
  if (postFilter) items = items.slice((page - 1) * take, page * take);
  return { items, page, pageCount: Math.max(1, Math.ceil(total / take)), total };
}

export async function getRetailOptionFacets() {
  return prisma.productOption.findMany({
    where: { product: { status: "ACTIVE", active: true, deletedAt: null } },
    select: {
      id: true,
      name: true,
      values: {
        where: { variants: { some: { variant: { active: true, deletedAt: null } } } },
        select: { id: true, value: true },
        orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getRetailProduct(slug: string, locale: StoreLocale) {
  const product = await prisma.product.findFirst({ where: { slug, status: "ACTIVE", active: true, deletedAt: null }, include: retailProductInclude });
  return product ? retailProductDto(product, locale) : null;
}

export async function getRetailHomepage(locale: StoreLocale) {
  const now = new Date();
  const [categories, featured, newest, bestSellerGroups, promotions] = await Promise.all([
    getRetailCategories(locale),
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
    featured: featured.map((product) => retailProductDto(product, locale)),
    newest: newest.map((product) => retailProductDto(product, locale)),
    bestSellers: bestIds.flatMap((id) => byId.get(id) ? [retailProductDto(byId.get(id)!, locale)] : []),
    promotions,
  };
}
