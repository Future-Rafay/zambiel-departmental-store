# Zambiel Phase 1 audit and implementation plan

This document records the completed pre-implementation review. It is the durable A–K Phase 1 artifact; `PLAN.md` tracks the implementation contract, `BRANDING.md` the white-label boundary, and `CATALOG-IMPORT.md` the approved import workflow.

## A. Existing architecture audit

- Next.js 16.3 App Router, React 19, Tailwind CSS 4, Prisma 7/MariaDB, Auth.js/NextAuth, Stripe, S3-compatible media, Zod, sanitize-html, and a React Native Android staff app.
- Public pages use `/de` and `/en`; admin shares the application under `/admin`; mobile uses `/api/v1` and never connects directly to MariaDB.
- Reusable seams: `src/server/db.ts`, `src/server/services/ordering.ts`, admin services/actions, route authorization, explicit DTOs, audit logs, order activities, notifications, email primitives, image URL resolution, S3 presigning, validation, transaction/idempotency patterns, UI primitives, and tests.
- Payment strengths retained: signature-verified webhooks, event claims/replay protection, immediate/delayed Stripe completion through one finalizer, tracker reconciliation, provider-authoritative payment state, and refund-before-cancel protection.
- Existing delivery zones already model postal codes, fee, minimum, free-delivery threshold, and active state.
- Catalog limitations found: food/diet/allergen/spice/scheduling fields; restaurant modifiers rather than SKU attributes; no variant stock, compare-at, barcode, or variant media; flat categories; modal-heavy administration.
- Baseline checks found Prisma validation and 27 tests passing with one isolated Stripe integration skipped. Stale `.next` types and a nested partial checkout polluted type/lint results; both generated/nested artifacts were quarantined recoverably before evaluating source failures.

## B. Restaurant-domain removal map

Remove from active production behavior: SaltNPepper identity/contact/metadata, Restaurant JSON-LD, menu/dish copy and fixtures, dietary/spice/allergen UI, cooking/preparation terminology, preparation windows/ETA scheduling, restaurant suggestions, restaurant blog/social/map/contact integrations, food imagery, restaurant seed data, old public routes, and restaurant Android/receipt labels.

Preserve authentication/roles, Prisma and migrations, ordering/payment seams, cart/checkout foundations, delivery zones, refund safety, activities/notifications/audits, customer tokens, media authorization, admin primitives, Android API/printing adapters, and tests. Existing deployed restaurant migrations are historical and remain immutable; removal uses forward expand/contract migrations.

## C. Zambiel UX analysis

Useful reference patterns: search-first header, category discovery, promotional hero, product rails, breadcrumbs, gallery thumbnails, variant selection, comparison pricing, availability, quantity, related discovery, collection counts, filters/sorting, pagination, and mobile filter controls.

Improvements selected: no vendor/supplier/affiliate/review claims, less promotional clutter, original Swiss-local neutral/green/gold direction, clear CHF pricing, consistent cards, generous spacing, URL-backed filters, labelled native radios, 44px targets, visible focus, reduced motion, and no fabricated ratings/dates/stock/store claims.

## D. Target product, variant, inventory, and order model

- Products: `DRAFT`, `ACTIVE`, `ARCHIVED`; bilingual copy/SEO; one primary hierarchical category; reusable tags; ordered media; optional source metadata.
- Options: arbitrary ordered product option definitions and values. Each purchasable variant maps to a valid value combination; a no-choice product uses one hidden default variant.
- Variants: SKU, CHF price, valid higher compare-at, barcode, weight, active state, stock on hand/reserved, low-stock threshold, and optional media.
- Inventory: variant source of truth plus idempotent movement ledger. Conditional transaction updates prevent oversell. Stripe reserves then consumes; cash orders decrement; terminal payment failure/expiry and valid cancellation restore once. No backorders, warehouses, or partial-refund restocking initially.
- Lifecycle: Stripe alone may be `PAYMENT_PENDING`; delivery uses confirmed → processing → out for delivery → delivered; pickup uses confirmed → processing → ready → picked up; cancellation is terminal; refunds remain payment/refund state.
- Customers: guest checkout and authenticated history/tracking; database-enforced one saved address.

## E. CSV analysis and mapping

Inspected `C:\Users\MY PC\Downloads\products_export\products_export.csv`: 821,789 bytes; SHA-256 `8d3d1472de7c0036cd1f452f936dce9474b2428db2d69cf12a6205e267a3c429`; 980 rows; 256 columns; 50 contiguous handles; 223 variant rows; 757 image-continuation rows; 950 unique gallery URLs; 214 variant-image assignments; 223 present unique SKUs; no barcodes or inventory quantity column.

Prices range 2.95–139.95 with no currency marker and are explicitly treated as CHF. Compare-at analysis found 150 valid higher values, 70 lower, and 3 equal. All source products are active but import as drafts with 25 units per new variant. Descriptions are long HTML; inline style/tracking/unsafe embeds are stripped and images mirrored. SEO is empty. Of 194 metafield columns, 28 contain data and belong in source metadata rather than schema columns.

Mapping: group by handle; separate product/variant/image rows; English source fields with nullable German; Shopify taxonomy to parent categories; tags to tags; meaningful arbitrary options retained; `Default Title` hidden; vendor ignored architecturally; invalid compare-at and risky origin/plug/noisy values reported; handle-based stable slug; ordered/hash-deduplicated media and variant reuse.

## F. Database migration and safety plan

Use only lowercase independent `zambiel_dev`/`zambiel_test`; seed/import refuse SaltNPepper, unknown, preview, and production databases. Preserve migration history. Forward phases: expand catalog/category/options/media/inventory/status/address structures; adapt application callers and map retail states; contract obsolete restaurant structures only after no callers remain. Run network media work outside transactions and use `migrate dev` locally / committed `migrate deploy` elsewhere.

## G. Branding/configuration architecture

Typed defaults centralize identity, locale/currency/timezone/country, order/storage prefixes, palette, fonts, metadata, and footer. Runtime settings merge verified contact, address, social, assets, hero/announcement, and delivery configuration. Missing values remain hidden. `BRANDING.md` separates easy configuration, admin/content changes, and structural source changes.

## H. Admin architecture

Dedicated dashboard, orders/detail, products/list/new/detail, categories/list/new/detail, inventory/movements, customers/address/history, discounts, payments/refunds, settings/delivery/staff/audit. Records with history archive rather than hard-delete. Destructive controls are separated and confirmed.

## I. Storefront architecture

Localized homepage, products, product detail, category/subcategory, search, cart, checkout, profile/single address, order history, and safe public tracking routes. Homepage order: hero, categories, featured, best sellers, new arrivals, promotions, verified-value proposition, footer. Initial catalog is server-rendered; filter/sort/page state lives in the URL; exact variants and all checkout totals are server validated.

## J. Dependency-ordered checklist

1. Protect worktree and establish a clean baseline.
2. Add central configuration, independent-database guards, and branding docs.
3. Add forward retail schema/migrations.
4. Adapt shared ordering, inventory, payments, transitions, DTOs, and authorization.
5. Replace restaurant seed/content assumptions.
6. Build and dry-run the guarded importer.
7. Build dedicated admin workflows.
8. Build catalog/storefront and homepage.
9. Adapt checkout/account/tracking/email/media.
10. Remove obsolete integrations after caller migration.
11. Adapt Android retail behavior/branding/receipts.
12. Update project guidance and removal evidence.
13. Run the full verification gate before any production enablement.

## K. Verification plan

- Prisma format/validate/generate; fresh guarded migration/status/seed; deterministic rerun.
- Import hash/count dry run, disposable apply, identical rerun, product/SKU/media/stock/draft counts, and anomaly reports.
- Unit/integration checks for money, slugs, options, trees, postal normalization, transitions, publishing, media dedup, concurrent stock/oversell, Stripe replay/delayed/failure/expiry, COD/cash pickup, exactly-once restoration, delivery/promo/address/auth authorization.
- Test, typecheck, lint, production build; keyboard/focus/contrast/errors/reduced motion and 375/768/1024/wide responsive browser journeys.
- Android test/typecheck/debug Gradle, actions/insets and 58/80 mm payloads; physical printing explicitly remains hardware-dependent.
- Production remains blocked pending approved identity/contact/legal/German content, dedicated database/S3/domain/provider credentials, delivery zones, Stripe webhook, and staging refund/payment proof.

## Locked decisions

Single seller; de/en; CHF; Europe/Zurich; source prices treated as CHF; initial imported stock 25; imported products draft; delivery Stripe/COD; pickup Stripe/cash-at-pickup; missing business claims hidden; no multiple addresses, warehouses, backorders, reviews, marketplace, scheduling engine, or partial-refund restocking.
