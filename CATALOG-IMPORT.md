# Shopify catalog import

`scripts/import-products.ts` is dry-run by default and accepts input only through `--file`.

```powershell
npm.cmd run catalog:import -- --file "C:\path\products_export.csv" --report ".artifacts\catalog-dry-run.json"
npm.cmd run catalog:import -- --file "C:\path\products_export.csv" --apply --currency CHF --report ".artifacts\catalog-apply.json"
```

Apply is refused unless the database is exactly lowercase `zambiel_dev` or `zambiel_test`. It must never target SaltNPepper, preview, or production. Images are prepared outside database transactions.

Rows group by Shopify `Handle`; products upsert by source handle and variants by SKU. Initial stock is 25 only for new variants. Products and generated categories remain drafts/hidden pending German review. Prices parse directly as CHF rappen; compare-at is accepted only above price. Vendor never creates a seller.

The importer preserves arbitrary meaningful options, hides `Default Title`, builds taxonomy parents, maps tags, stores nonempty unmodelled metafields in `sourceMetadata`, sanitizes HTML, mirrors embedded/gallery/variant images, follows `Image Position`, and content-hash deduplicates media. Risky origin/plug/noisy values and unavailable source images are reported rather than rewritten; an unavailable image does not discard otherwise valid product data.

Public rendering prefers each media row's Shopify `sourceUrl` and falls back to its retained S3/local object key. Run `npm.cmd run catalog:stats -- --check-images` to validate all stored source URLs in bounded batches. The local demo seed adds generated bilingual copy and publishes the fixture catalogue; the importer itself remains draft-first.

Unchanged hashes skip on rerun. Each product is atomic after media preparation. Reports list created, updated, skipped, rejected, and anomalies. Back up before apply; rollback uses that backup and manifest, and must never delete products with order history.

Verified source: SHA-256 `8d3d1472de7c0036cd1f452f936dce9474b2428db2d69cf12a6205e267a3c429`, 980 rows, 50 handles, 223 SKU variants, 950 ordered gallery rows, and 73 invalid compare-at values.
