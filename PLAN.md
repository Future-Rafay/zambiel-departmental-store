# Zambiel implementation plan

## Product contract

Zambiel is one Swiss store and one seller. German is primary, English secondary, money is integer CHF rappen, time displays in `Europe/Zurich`, delivery is postal-zone based, and each customer has at most one saved address. Do not add vendors, tenants, organizations, payouts, warehouses, backorders, multiple addresses, or partial-refund restocking.

## Implemented foundation

- Central typed store defaults in `src/config/store.ts`, runtime merge in `src/server/services/store-config.ts`, and rebranding instructions in `BRANDING.md`.
- Forward retail migration adds product lifecycle, category hierarchy, arbitrary options, ordered media, variant pricing/barcode/stock, inventory ledger, retail statuses, and one-address constraint while preserving deployed migration history.
- `src/server/services/ordering.ts` remains the stable public ordering facade. Focused `order-*.ts` modules own quotes, reads, notification claims, and Stripe lifecycle without changing callers; COD and cash-at-pickup remain retail flows.
- Localized product, category, search, cart, checkout, account, and tracking routes; dedicated product/category/inventory admin workflows plus customers, discounts, payments, settings, orders, and audit surfaces.
- Localized contact pages, durable contact/product-request delivery controls, compact database-backed filters, descendant-aware category counts, product breadcrumbs/gallery/sharing/recommendations/history, and a richer branded homepage/footer.
- Inter headings, Archivo body text, the supplied Zambiel marks, shared rounded public components, and accessible manual hero/gallery/navigation controls.
- Checkout, ordering, retail actions, product editing, and admin order history have focused modules while their established entry points remain compatible.
- Guarded Shopify importer and report workflow documented in `CATALOG-IMPORT.md`. Imports remain draft and start at 25 units; the guarded demo seed publishes the reviewed local fixture set.
- Restaurant WordPress/contact/map/menu content was removed; `/de/menu` and `/en/menu` remain redirects to products for compatibility.

## Production blockers

See `content-todo.md`. The independent local `zambiel_dev` database is established. Approved legal/German content, dedicated S3 policy, real delivery zones, Stripe staging tests, and deployment credentials are still required before production enablement.

## Verification gate

Run Prisma format/validate/generate and fresh-database migration/seed; importer dry-run and repeatability checks; unit/integration tests; typecheck, lint, build; responsive and keyboard browser journeys; and Stripe webhook/refund staging.

## Current verification (2026-09-03)

- Seven migrations now define the independent Zambiel schema, including persistent inquiry throttling. Local `zambiel_dev` still needs `20260902000000_add_public_request_rate_limit` applied through the reviewed migration workflow.
- Catalog: 50 imported products, 223 imported variants, 950 Shopify-source media rows, 62 active categories, 52 active products, and 225 active variants. Stock is 5,568 on hand and 1 reserved after demo order movements.
- Demo business data: 5 customers, 2 delivery zones, 10 orders, `WELCOME10`, 1 successful refund, 10 notifications, 10 audits, and 12 idempotent order movements.
- Prisma format/validation/generation, 34 tests, typecheck, clean lint, and production build pass; four isolated-database tests are skipped without `TEST_DATABASE_URL`.
- Browser smoke checks pass German/English home, categories, contact, product gallery, and catalogue search filtering at 375/768/1024/1440 without horizontal overflow. Intermittent remote S3/Shopify image 403/500/504 responses remain an operational catalogue/provider issue.
- Product decision (2026-08-31): Zambiel has no planned React Native application. Existing native artifacts are frozen and excluded from implementation and release verification.
- Authenticated admin mutations, live Stripe/webhook/refund, and production-provider checks remain blocked until a browser session and staging credentials/endpoints are supplied.
