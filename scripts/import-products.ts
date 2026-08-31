import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  extractImageUrls,
  metafieldMetadata,
  normalizeOptions,
  parseCsv,
  parseMoney,
  sanitizeProductDescription,
  slugify,
  type CsvRow,
} from "../src/server/import/shopify-csv";
import { importExternalProductImage } from "../src/server/storage/s3";

const args = process.argv.slice(2);
const valueAfter = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const apply = args.includes("--apply");
const checkImages = args.includes("--check-images");
const inputArgument = valueAfter("--file");
const reportArgument = valueAfter("--report");
const currency = valueAfter("--currency");

if (!inputArgument)
  throw new Error(
    "Pass the Shopify export explicitly with --file <products_export.csv>.",
  );
if (apply && currency !== "CHF")
  throw new Error(
    "Apply refused: pass --currency CHF after confirming the source prices are Swiss francs.",
  );

const input = resolve(inputArgument);
async function main() {
  const inputSource = await readFile(input, "utf8");
  const fileHash = createHash("sha256").update(inputSource).digest("hex");
  const rows = parseCsv(inputSource);
  const groups = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const handle = row.Handle?.trim();
    if (!handle) continue;
    const group = groups.get(handle) ?? [];
    group.push(row);
    groups.set(handle, group);
  }

  type ImportIssue = {
    severity: "error" | "warning";
    handle?: string;
    sku?: string;
    message: string;
  };
  const issues: ImportIssue[] = [];
  const seenSkus = new Map<string, string>();
  const imageUrls = new Set<string>();
  let variantCount = 0;
  let imageRowCount = 0;

  for (const [handle, productRows] of groups) {
    const header =
      productRows.find((row) => row.Title?.trim()) ?? productRows[0];
    if (!header?.Title?.trim())
      issues.push({ severity: "error", handle, message: "Missing title" });
    if (!slugify(handle))
      issues.push({
        severity: "error",
        handle,
        message: "Handle cannot produce a slug",
      });
    if (!header?.["Product Category"]?.trim())
      issues.push({
        severity: "warning",
        handle,
        message: "Missing Shopify category; will use Uncategorised",
      });
    const combinations = new Set<string>();
    for (const row of productRows) {
      const galleryUrl = row["Image Src"]?.trim();
      if (galleryUrl) {
        imageRowCount += 1;
        imageUrls.add(galleryUrl);
      }
      for (const embedded of extractImageUrls(row["Body (HTML)"] ?? ""))
        imageUrls.add(embedded);
      const sku = row["Variant SKU"]?.trim();
      if (!sku) continue;
      variantCount += 1;
      const previousHandle = seenSkus.get(sku);
      if (previousHandle)
        issues.push({
          severity: "error",
          handle,
          sku,
          message: `Duplicate SKU also used by ${previousHandle}`,
        });
      else seenSkus.set(sku, handle);
      const price = parseMoney(row["Variant Price"] ?? "");
      if (price === null)
        issues.push({
          severity: "error",
          handle,
          sku,
          message: `Malformed price ${JSON.stringify(row["Variant Price"])}`,
        });
      const compareAt = row["Variant Compare At Price"]?.trim()
        ? parseMoney(row["Variant Compare At Price"])
        : null;
      if (compareAt !== null && price !== null && compareAt <= price)
        issues.push({
          severity: "warning",
          handle,
          sku,
          message: "Compare-at price is not higher and will be ignored",
        });
      const options = normalizeOptions(row);
      const combination = options
        .map(({ name, value }) => `${name}:${value}`)
        .sort()
        .join("|");
      if (combination && combinations.has(combination))
        issues.push({
          severity: "error",
          handle,
          sku,
          message: `Duplicate option combination ${combination}`,
        });
      combinations.add(combination);
      for (const option of options) {
        if (
          /ships from|plug type/i.test(option.name) ||
          (/color/i.test(option.name) &&
            /\b(pack|pcs?|set)\b/i.test(option.value))
        ) {
          issues.push({
            severity: "warning",
            handle,
            sku,
            message: `Review source option ${option.name}: ${option.value}`,
          });
        }
      }
    }
  }

  const report = {
    mode: apply ? "apply" : "dry-run",
    input,
    sha256: fileHash,
    csvRows: rows.length,
    products: groups.size,
    variants: variantCount,
    imageRows: imageRowCount,
    uniqueSourceImages: imageUrls.size,
    initialStockPerVariant: 25,
    publicationStatus: "DRAFT",
    issues,
    imported: [] as string[],
    skipped: [] as string[],
    rejected: [] as string[],
  };

  async function saveReport() {
    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (reportArgument) {
      const reportPath = resolve(reportArgument);
      await mkdir(dirname(reportPath), { recursive: true });
      await writeFile(reportPath, json, "utf8");
    }
    console.log(json);
  }

  if (!apply) {
    if (checkImages) {
      const urls = [...imageUrls];
      for (let offset = 0; offset < urls.length; offset += 16) {
        await Promise.all(
          urls.slice(offset, offset + 16).map(async (url) => {
            try {
              const response = await fetch(url, {
                method: "HEAD",
                signal: AbortSignal.timeout(8_000),
              });
              if (!response.ok)
                issues.push({
                  severity: "warning",
                  message: `Image check failed (${response.status}): ${url}`,
                });
            } catch {
              issues.push({
                severity: "warning",
                message: `Image check failed: ${url}`,
              });
            }
          }),
        );
      }
    }
    await saveReport();
    if (issues.some(({ severity }) => severity === "error"))
      process.exitCode = 2;
  } else {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl)
      throw new Error("Import refused: DATABASE_URL is missing.");
    const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
    if (!/^(zambiel_dev|zambiel_test)$/.test(databaseName)) {
      throw new Error(
        "Import refused: DATABASE_URL must target lowercase zambiel_dev or zambiel_test.",
      );
    }
    if (issues.some(({ severity }) => severity === "error")) {
      await saveReport();
      throw new Error("Import refused because validation errors were found.");
    }

    const prisma = new PrismaClient({
      adapter: new PrismaMariaDb(databaseUrl),
    });
    const importedImages = new Map<
      string,
      Awaited<ReturnType<typeof importExternalProductImage>>
    >();
    const importImage = async (url: string) => {
      const cached = importedImages.get(url);
      if (cached) return cached;
      const imported = await importExternalProductImage(url);
      importedImages.set(url, imported);
      return imported;
    };

    try {
      for (const [handle, productRows] of groups) {
        const header = productRows.find((row) => row.Title?.trim())!;
        const productHash = createHash("sha256")
          .update(JSON.stringify(productRows))
          .digest("hex");
        const existing = await prisma.product.findUnique({
          where: { sourceHandle: handle },
          select: { sourceImportHash: true },
        });
        if (existing?.sourceImportHash === productHash) {
          report.skipped.push(handle);
          continue;
        }

        const productImageUrls = new Set<string>();
        for (const row of productRows) {
          if (row["Image Src"]?.trim())
            productImageUrls.add(row["Image Src"].trim());
          if (row["Variant Image"]?.trim())
            productImageUrls.add(row["Variant Image"].trim());
          for (const url of extractImageUrls(row["Body (HTML)"] ?? ""))
            productImageUrls.add(url);
        }
        const urlMap = new Map<
          string,
          Awaited<ReturnType<typeof importExternalProductImage>>
        >();
        const urls = [...productImageUrls];
        for (let offset = 0; offset < urls.length; offset += 8) {
          const batch = urls.slice(offset, offset + 8);
          const imported = await Promise.allSettled(batch.map(importImage));
          imported.forEach((result, index) => {
            if (result.status === "fulfilled")
              urlMap.set(batch[index], result.value);
            else
              issues.push({
                severity: "warning",
                handle,
                message: `Skipped unavailable media: ${batch[index]}`,
              });
          });
        }

        const categoryPath =
          header["Product Category"]
            ?.split(">")
            .map((part) => part.trim())
            .filter(Boolean) ?? [];
        if (!categoryPath.length) categoryPath.push("Uncategorised");
        const tags = (header.Tags ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        const variantRows = productRows.filter((row) =>
          row["Variant SKU"]?.trim(),
        );
        const galleryRows = productRows.filter((row) =>
          row["Image Src"]?.trim(),
        );
        const descriptionEn = sanitizeProductDescription(
          header["Body (HTML)"] ?? "",
          new Map([...urlMap].map(([url, image]) => [url, image.publicUrl])),
        );

        await prisma.$transaction(
          async (tx) => {
            let parentId: string | null = null;
            let categoryId = "";
            const pathParts: string[] = [];
            for (const [sortOrder, name] of categoryPath.entries()) {
              pathParts.push(name);
              const slug = slugify(pathParts.join("-"));
              const category: { id: string } = await tx.category.upsert({
                where: { slug },
                update: { nameEn: name, parentId, sortOrder },
                create: {
                  slug,
                  nameDe: "",
                  nameEn: name,
                  parentId,
                  sortOrder,
                  active: false,
                },
              });
              parentId = category.id;
              categoryId = category.id;
            }

            const product = await tx.product.upsert({
              where: { sourceHandle: handle },
              update: {
                categoryId,
                slug: slugify(handle),
                nameEn: header.Title.trim(),
                descriptionEn: descriptionEn || null,
                status: "DRAFT",
                active: false,
                available: false,
                seoTitleEn: header["SEO Title"]?.trim() || header.Title.trim(),
                seoDescriptionEn: header["SEO Description"]?.trim() || null,
                sourceImportHash: productHash,
                sourceMetadata: {
                  fileHash,
                  metafields: metafieldMetadata(header),
                  sourcePublished: header.Published,
                  sourceStatus: header.Status,
                },
                tags: { set: [] },
              },
              create: {
                categoryId,
                slug: slugify(handle),
                sourceHandle: handle,
                nameDe: "",
                nameEn: header.Title.trim(),
                descriptionEn: descriptionEn || null,
                status: "DRAFT",
                active: false,
                available: false,
                seoTitleEn: header["SEO Title"]?.trim() || header.Title.trim(),
                seoDescriptionEn: header["SEO Description"]?.trim() || null,
                sourceImportHash: productHash,
                sourceMetadata: {
                  fileHash,
                  metafields: metafieldMetadata(header),
                  sourcePublished: header.Published,
                  sourceStatus: header.Status,
                },
              },
            });

            for (const name of tags) {
              const tag = await tx.productTag.upsert({
                where: { slug: slugify(name) },
                update: { name },
                create: { name, slug: slugify(name) },
              });
              await tx.product.update({
                where: { id: product.id },
                data: { tags: { connect: { id: tag.id } } },
              });
            }

            await tx.productOption.deleteMany({
              where: { productId: product.id },
            });
            const optionValueIds = new Map<string, string>();
            const optionValues = new Map<string, string[]>();
            for (const row of variantRows) {
              for (const { name, value } of normalizeOptions(row)) {
                const values = optionValues.get(name) ?? [];
                if (!values.includes(value)) values.push(value);
                optionValues.set(name, values);
              }
            }
            for (const [optionSort, [name, values]] of [
              ...optionValues,
            ].entries()) {
              const option = await tx.productOption.create({
                data: { productId: product.id, name, sortOrder: optionSort },
              });
              for (const [valueSort, value] of values.entries()) {
                const created = await tx.productOptionValue.create({
                  data: { optionId: option.id, value, sortOrder: valueSort },
                });
                optionValueIds.set(`${name}\0${value}`, created.id);
              }
            }

            const importedSkus: string[] = [];
            const variantIdByImageUrl = new Map<string, string>();
            for (const [sortOrder, row] of variantRows.entries()) {
              const sku = row["Variant SKU"].trim();
              importedSkus.push(sku);
              const options = normalizeOptions(row);
              const priceRappen = parseMoney(row["Variant Price"])!;
              const rawCompareAt = row["Variant Compare At Price"]?.trim()
                ? parseMoney(row["Variant Compare At Price"])
                : null;
              const previous = await tx.productVariant.findUnique({
                where: { sku },
                select: { id: true },
              });
              const variant = await tx.productVariant.upsert({
                where: { sku },
                update: {
                  productId: product.id,
                  nameDe: "",
                  nameEn:
                    options.map(({ value }) => value).join(" / ") || "Default",
                  priceRappen,
                  compareAtPriceRappen:
                    rawCompareAt !== null && rawCompareAt > priceRappen
                      ? rawCompareAt
                      : null,
                  barcode: row["Variant Barcode"]?.trim() || null,
                  weightGrams: Number(row["Variant Grams"]) || null,
                  trackInventory:
                    row["Variant Inventory Tracker"] === "shopify",
                  active: true,
                  deletedAt: null,
                  sortOrder,
                },
                create: {
                  productId: product.id,
                  nameDe: "",
                  nameEn:
                    options.map(({ value }) => value).join(" / ") || "Default",
                  sku,
                  priceRappen,
                  compareAtPriceRappen:
                    rawCompareAt !== null && rawCompareAt > priceRappen
                      ? rawCompareAt
                      : null,
                  barcode: row["Variant Barcode"]?.trim() || null,
                  weightGrams: Number(row["Variant Grams"]) || null,
                  trackInventory:
                    row["Variant Inventory Tracker"] === "shopify",
                  stockOnHand: 25,
                  active: true,
                  sortOrder,
                },
              });
              if (!previous) {
                await tx.inventoryMovement.create({
                  data: {
                    variantId: variant.id,
                    type: "OPENING_STOCK",
                    quantityChange: 25,
                    reason: "Shopify CSV initial stock",
                    idempotencyKey: `import:${fileHash}:${sku}:opening`,
                  },
                });
              }
              await tx.productVariantOptionValue.deleteMany({
                where: { variantId: variant.id },
              });
              const ids = options
                .map(({ name, value }) =>
                  optionValueIds.get(`${name}\0${value}`),
                )
                .filter((id): id is string => Boolean(id));
              if (ids.length)
                await tx.productVariantOptionValue.createMany({
                  data: ids.map((optionValueId) => ({
                    variantId: variant.id,
                    optionValueId,
                  })),
                });
              if (row["Variant Image"]?.trim())
                variantIdByImageUrl.set(
                  row["Variant Image"].trim(),
                  variant.id,
                );
            }
            await tx.productVariant.updateMany({
              where: { productId: product.id, sku: { notIn: importedSkus } },
              data: {
                active: false,
                deletedAt: new Date(),
                updatedAt: new Date(),
              },
            });

            await tx.productMedia.deleteMany({
              where: { productId: product.id },
            });
            for (const [fallbackSort, row] of galleryRows.entries()) {
              const sourceUrl = row["Image Src"].trim();
              const image = urlMap.get(sourceUrl);
              if (!image) continue;
              await tx.productMedia.create({
                data: {
                  productId: product.id,
                  variantId: variantIdByImageUrl.get(sourceUrl) ?? null,
                  objectKey: image.key,
                  sourceUrl,
                  contentHash: image.contentHash,
                  altEn: row["Image Alt Text"]?.trim() || header.Title.trim(),
                  sortOrder: Number(row["Image Position"]) || fallbackSort,
                },
              });
            }
            const primary = galleryRows[0]?.["Image Src"]?.trim();
            if (primary)
              await tx.product.update({
                where: { id: product.id },
                data: { imageKey: primary },
              });
          },
          { timeout: 30_000 },
        );

        report.imported.push(handle);
        console.log(`Imported ${handle}`);
      }
    } finally {
      await prisma.$disconnect();
    }
    await saveReport();
    if (report.rejected.length) process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
