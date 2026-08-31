# Zambiel implementation plan

## Product contract

Zambiel is one Swiss store and one seller. German is primary, English secondary, money is integer CHF rappen, time displays in `Europe/Zurich`, delivery is postal-zone based, and each customer has at most one saved address. Do not add vendors, tenants, organizations, payouts, warehouses, backorders, multiple addresses, or partial-refund restocking.

## Implemented foundation

- Central typed store defaults in `src/config/store.ts`, runtime merge in `src/server/services/store-config.ts`, and rebranding instructions in `BRANDING.md`.
- Forward retail migration adds product lifecycle, category hierarchy, arbitrary options, ordered media, variant pricing/barcode/stock, inventory ledger, retail statuses, and one-address constraint while preserving deployed migration history.
- `src/server/services/ordering.ts` remains the authoritative quote/order/payment/inventory seam. Stripe webhooks and replay-safe finalization remain authoritative; COD and cash-at-pickup are retail flows.
- Localized product, category, search, cart, checkout, account, and tracking routes; dedicated product/category/inventory admin workflows plus customers, discounts, payments, settings, orders, and audit surfaces.
- Guarded Shopify importer and report workflow documented in `CATALOG-IMPORT.md`. Imports remain draft and start at 25 units; the guarded demo seed publishes the reviewed local fixture set.
- Restaurant WordPress/contact/map/menu content was removed; `/de/menu` and `/en/menu` remain redirects to products for compatibility.

## Production blockers

See `content-todo.md`. The independent local `zambiel_dev` database is established. Approved identity/legal/German content, dedicated S3 policy, real delivery zones, Stripe staging tests, and deployment credentials are still required before production enablement. Physical receipt printing remains hardware-dependent.

## Verification gate

Run Prisma format/validate/generate and fresh-database migration/seed; importer dry-run and repeatability checks; unit/integration tests; typecheck, lint, build; responsive and keyboard browser journeys; Stripe webhook/refund staging; Android tests/typecheck/debug build and physical printer checks.

## Current verification (2026-08-29)

- Independent `zambiel_dev`: all six migrations applied; the deterministic demo seed passed twice with stable counts and current migration status.
- Catalog: 61 active categories, 50 active products, 223 active variants, and 950 Shopify-source media rows. All 950 source URLs passed bounded checks; stock is 5,568 on hand and 1 reserved after demo order movements.
- Demo business data: 5 customers, 2 delivery zones, 10 orders, `WELCOME10`, 1 successful refund, 10 notifications, 10 audits, and 12 idempotent order movements.
- Web: 27 tests passed and one isolated Stripe integration test skipped; typecheck, lint, and production build passed. German/English storefront, catalogue, product/variant, cart, checkout, login redirects, and 375/768/1024/1440 responsive checks passed without broken images or console errors.
- Android: presentation tests and TypeScript passed. Gradle debug is blocked on this machine by `Unable to establish loopback connection`; physical printers remain unverified.
- Authenticated admin mutations, live Stripe/webhook/refund, and production-provider checks remain blocked until a browser session and staging credentials/endpoints are supplied.
