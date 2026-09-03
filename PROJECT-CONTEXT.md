# Zambiel project context

This is the durable handoff for future development in this repository. It records the current architecture and verified state; source code and committed migrations remain authoritative when this document becomes stale.

## Product and repository boundary

- Product: Zambiel, one Swiss departmental store with exactly one seller.
- Repository: this existing checkout only. Do not create, clone, initialize, or copy another project.
- Public locales: German primary and English secondary under `/de` and `/en`.
- Money: integer CHF rappen. Time is stored in UTC and displayed in `Europe/Zurich`.
- Fulfillment: delivery or pickup. Delivery supports Stripe/COD; pickup supports Stripe/cash at pickup.
- Excluded: vendors, tenants, organizations, commissions, payouts, order splitting, multiple saved addresses, warehouses, backorders, reviews, and partial-refund restocking.

## Technology

- Next.js 16.3 App Router, React 19, Tailwind CSS 4.
- Prisma 7 with MariaDB through `src/server/db.ts`.
- NextAuth database sessions and customer/owner/staff authorization.
- Stripe Checkout/webhooks and S3-compatible media storage.
- Zod trust-boundary validation and Node test runner.
- No React Native application is planned for Zambiel. The existing `apps/saltnpepper-staff-android` directory is frozen legacy code and is not part of the Zambiel product or verification scope.

Read installed Next.js documentation in `node_modules/next/dist/docs/` before framework changes because this version differs from older conventions.

## Shared architectural seams

- `src/config/store.ts`: release-managed identity, locale, currency, timezone, theme, order prefix, storage prefix, and safe defaults.
- `src/server/services/store-config.ts`: merges admin/runtime settings over central defaults.
- `src/server/db.ts`: only Prisma client construction seam.
- `src/server/services/ordering.ts`: stable ordering facade and authoritative order creation, inventory reservation, retail transitions, and product-availability mutations.
- `src/server/services/order-quotes.ts`, `order-stripe.ts`, `order-queries.ts`, `order-notifications.ts`, and `order-errors.ts`: focused quote/repricing, Stripe lifecycle, read DTO, delivery-claim, and error modules re-exported through the ordering facade.
- `src/server/services/admin.ts`: order cancellation/refund, delivery/settings, staff, audit, and retained compatibility operations.
- `src/server/services/retail-catalog.ts`: public catalog/category/search/product/home queries and variant availability.
- `src/app/admin/(protected)/retail-actions.ts`: stable server-action facade. Product/category, media, variant/option, and inventory/order implementations live in the adjacent `retail-actions/` directory.
- `src/server/storage/s3.ts`: upload authorization, external image import, store-prefix keys, and `resolvePublicImageUrl`.
- `src/server/import/shopify-csv.ts` and `scripts/import-products.ts`: guarded Shopify parsing/import.

Fix behavior at these shared seams instead of adding parallel database clients, checkout logic, payment finalizers, or catalog APIs.

## Route map

Public storefront:

- `/{locale}` homepage
- `/{locale}/products` and `/{locale}/products/[slug]`
- `/{locale}/categories` and `/{locale}/categories/[slug]`
- `/{locale}/search`, `/cart`, `/checkout`, and `/contact`
- `/{locale}/account`, `/account/orders`, and `/orders/[orderNumber]`
- `/{locale}/menu` and singular order routes are compatibility redirects only.

Administration:

- `/admin/products`, `/admin/products/new`, `/admin/products/[productId]`
- `/admin/categories`, `/admin/categories/new`, `/admin/categories/[categoryId]`
- `/admin/inventory`, `/orders`, `/customers`, `/discounts`, `/payments`, `/settings`, `/staff`, `/audit`
- Old `/admin/menu/*`, `/admin/availability`, and `/admin/settings/hours` routes redirect to retail replacements.

APIs:

- Customer ordering/tracking: `/api/v1/customer/*`
- Frozen compatibility endpoints remain under `/api/v1/staff/*`; do not extend or advertise them as a Zambiel mobile application.
- Stripe: `/api/webhooks/stripe`; preserve signature verification, event claims, replay protection, and shared idempotent finalization.
- Media: `/api/uploads/images`; owner-authorized and limited by MIME, size, and configured object prefix.
- Public inquiries: `POST /api/v1/public/contact`; same-origin, Zod-validated, honeypot- and rate-limit-protected contact/product-request delivery.
- Newsletter: `POST /api/v1/public/newsletter` and `POST /api/v1/public/newsletter/unsubscribe`; immediate idempotent subscription, token-protected unsubscribe, and durable IP/email throttling.
- Password recovery: `POST /api/auth/password/forgot` and `POST /api/auth/password/reset`; generic forgot responses, one-hour single-use hashed tokens, password rehashing, and session revocation.

## Catalog and inventory contract

- Categories are hierarchical and slugged. A product has one primary category and reusable tags.
- Products use `DRAFT`, `ACTIVE`, or `ARCHIVED`. Publishing requires reviewed German name and description.
- Options are arbitrary definitions/values. Do not assume only size and color.
- Every purchasable item is a variant; choice-less products use a default variant.
- Variant fields include SKU, price, compare-at price, barcode, weight, active state, stock, reserved stock, threshold, and optional media.
- Inventory changes require an `InventoryMovement` with an idempotency key. Never update stock without the ledger.
- Admin **Delete** actions perform safe operational deletion (`deletedAt` plus inactive/unavailable state), preserving order snapshots, inventory movements, and audit history. Categories remain blocked while active children or products exist.
- Product descriptions are sanitized HTML edited through the focused TipTap toolbar. Description images are limited to store-owned upload URLs or already-imported mapped media.
- Admin money inputs accept decimal CHF (for example `49.65`) through the shared parser; persistence and calculations remain integer rappen.

## Order, payment, and stock rules

- Retail transitions: `CONFIRMED → PROCESSING → OUT_FOR_DELIVERY → DELIVERED` or `CONFIRMED → PROCESSING → READY_FOR_PICKUP → PICKED_UP`, plus cancellation.
- `PAYMENT_PENDING` is for unpaid Stripe orders. COD and cash-at-pickup orders are confirmed at creation while payment state remains separate.
- Server code reprices lines and validates stock, promotions, postal zones, fulfillment, and payment methods.
- Stripe reserves stock; verified success consumes it; terminal failure/expiry releases it.
- Cancellation or full refund-and-cancel restores stock exactly once. Partial refunds do not restock.
- Paid Stripe orders must use refund-before-cancel. Destructive controls require separation, confirmation, and reasons.
- Legacy `PREPARING`/`COMPLETED`, scheduling columns, restaurant modifiers, and dietary fields remain only for expand/contract compatibility. Never introduce new dependencies on them.

## Database and data safety

- Local development database is exactly lowercase `zambiel_dev`; tests/imports may use `zambiel_test`.
- Seed/import guards reject `saltnpepper_dev`, unknown databases, and production targets.
- Never edit or replace deployed migration history. Add forward migrations.
- Never copy SaltNPepper production data or credentials into Zambiel.
- Network media work stays outside database transactions; each validated product is written atomically.
- `.env` is local and ignored. Change only `.env.example` when documenting variables.

## Shopify import state

Source contract:

- SHA-256: `8d3d1472de7c0036cd1f452f936dce9474b2428db2d69cf12a6205e267a3c429`
- 980 CSV rows, 50 product handles, 223 SKU variants, 950 ordered gallery rows.
- Source has no inventory quantities, barcodes, German translations, or proven SEO content. CHF and initial stock 25 are explicitly locked project assumptions.

Commands:

```powershell
npm.cmd run catalog:import -- --file "C:\path\products_export.csv" --report .artifacts/catalog-dry-run.json
npm.cmd run catalog:import -- --file "C:\path\products_export.csv" --apply --currency CHF --report .artifacts/catalog-apply.json
npm.cmd run catalog:stats
```

Import is dry-run by default, applies only to `zambiel_dev`/`zambiel_test`, stores drafts, groups by handle, upserts by handle/SKU, and skips unchanged hashes. Unavailable source media is reported without rejecting valid product data. Read `CATALOG-IMPORT.md` before changing it.

## Current verified local state (2026-09-03)

### Email and footer correction (2026-09-04)

- Follow-up: Facebook, Instagram, and WhatsApp footer icons are restored with user-requested platform-homepage defaults in store configuration. Configured Facebook/Instagram profiles take precedence; generic links are not verified store profiles.

- Public page shells align to `max-w-7xl`, including legal and account pages. Authentication forms retain compact inner cards. The footer removes the About anchor, uses a green/gold branded layout, and retains functional shop/legal/support links plus the social links described above. Contact uses runtime contact settings and no longer advertises live chat.
- All outgoing email families reuse the single table-based branded shell in `src/server/email/templates.ts`, deriving colors, Inter/Archivo font stacks, tagline, and footer text from `src/config/store.ts`. Email clients may fall back to Arial; web fonts are not guaranteed. Email bodies remain 600px wide for inbox compatibility, independent of the website's 7xl width.
- Width/email follow-up verification: 43 tests (38 passed, 5 isolated-database skips), typecheck, and production build passed; lint retains the unrelated category-card warning. Privacy, returns, terms, and contact report a 1280px maximum at 375/1440 viewports without overflow or an About footer link. The generated email preview fits 375px; Outlook/Gmail client-specific rendering was not directly tested.

- Public rate-limit keys now HMAC the scope and normalized identifier together into 64 hexadecimal characters, fitting the existing `VARCHAR(80)` without a migration. Existing old-format counters expire naturally; the rollout starts fresh counters once.
- Ignored `.env.development.local` selects `Zambiel <onboarding@resend.dev>` and `CONTACT_EMAIL_TO_DEV` for local contact inquiries only. Public store contact information and acknowledgement/newsletter/reset/order recipients remain unchanged. The override is rejected outside development and by production configuration validation.
- Contact and newsletter requests to the approved Resend account Gmail returned HTTP 200, including the contact acknowledgement. Provider acceptance is verified, not inbox receipt. Other recipient addresses still require a verified sending domain; this supersedes the older invalid-key test below.
- The shared footer no longer advertises live chat. German/English `/returns` draft pages are linked alongside Terms and Privacy; checkout links Terms/Privacy and newsletter links Privacy. Legal text remains unapproved and is not a production policy.
- Regression checks cover fixed key sizes, recipient safety, provider rejection, and production guards. Guarded `zambiel_dev` checks passed long-scope concurrent throttling and expiry, with only generated test counters cleaned up.
- Verification: 42 tests (37 passed, 5 isolated-database skips); corrected email tests also passed independently. Typecheck, production build, and diff whitespace checks passed. Lint has no errors and one unrelated unused-import warning in the user-edited category card. Browser checks at 375/1440 verified both localized returns pages, footer legal links, no chat placeholder, and no horizontal overflow.

- Eight migrations define the independent Zambiel schema. `20260902000000_add_public_request_rate_limit` and the forward-only `20260903190000_add_newsletter_subscriber` migration are applied to local `zambiel_dev`; migration status is current.
- Catalog statistics: 50 imported products, 223 imported variants, 950 Shopify-source media records, 62 active categories, 52 active products, 225 active variants, 5,568 stock units, 1 reserved unit, and 223 opening-stock movements.
- Demo business tables: 5 customers and addresses, 2 delivery zones, 10 orders, `WELCOME10`, 1 refund, 10 notification deliveries, 10 audit entries, and 12 order inventory movements.
- Identical second import: 50 skipped, zero imported, zero rejected.
- Media: all 950 stored Shopify URLs passed bounded availability checks; product media prefers `sourceUrl` and retains S3 keys as fallback metadata.
- Web: cart, checkout, account-order, and tracking panels use sharper edges over a lightweight CSS paper grain while controls retain modest rounding. Admin product/category forms include English-name slug generation; products use bilingual TipTap rich-description editors.
- Maintainability: ordering, checkout, retail actions, product editing, and admin order history are split into focused modules while their existing route/action/service entry points remain stable.
- Prisma format/validation/generation, 41 tests (36 passing and 5 isolated-database skips), typecheck, clean lint, production build, and `git diff --check` pass.
- Authenticated browser checks passed low/empty inventory defaults, decimal price rendering, rich-editor controls, safe delete controls, and product/category slug generation. Public cart/checkout styling passed at 375/768/1024/1440 without horizontal overflow. An authorized tracking fixture and live rich-image upload were not exercised. Remote S3 image responses still produce 403 console errors and remain a catalogue/provider cleanup item.
- One clearly labelled live Resend delivery check reached the provider but failed with HTTP 401 (`API key is invalid`). Email templates/services have automated mocked-delivery coverage; live delivery remains blocked until the configured key is replaced.
- Product decision (2026-08-31): Zambiel will not have a React Native application. Historical native verification is no longer a release gate.
- Not verified: live Stripe/webhook/refund flows, concurrent oversell against an isolated integration database, rich-editor S3 upload/public delivery, or production credentials/providers.

## Branding and content

- Read `BRANDING.md` before identity, domain, locale, currency, theme, storage prefix, or provider changes.
- Runtime contact/address/social/homepage fields may be edited in Admin Settings.
- Missing business, social, legal, delivery, or promotional claims stay hidden; never invent them.
- The local demo seed publishes generated bilingual catalogue copy. Human German and commercial review remains required before production.
- Outstanding production inputs are tracked in `content-todo.md`.

## Compatibility and cleanup boundaries

- Historical migration files are immutable.
- Frozen React Native and staff-mobile artifacts intentionally remain untouched. Removing them and their compatibility endpoints requires a separate reviewed cleanup after dependency and deployment checks.
- Old public/admin route redirects can remain for compatibility but must not contain restaurant behavior.
- A recoverable quarantine from the initial cleanup exists outside the repository under `C:\Users\MY PC\Documents\Codex\quarantine`; do not delete it without explicit instruction.

## Verification commands

Run checks proportional to the change. Before a broad completion claim run:

```powershell
npx.cmd prisma format
npx.cmd prisma validate
npx.cmd prisma generate
npx.cmd prisma migrate status
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
```

For UI changes, also test keyboard interaction, visible focus, reduced motion, structured errors, and responsive widths. Report credential-, provider-, database-, and hardware-dependent checks honestly.

## Documentation ownership

- `AGENTS.md`: mandatory rules and task startup behavior.
- `PROJECT-CONTEXT.md`: durable architecture/current-state handoff.
- `PLAN.md`: implemented foundation, blockers, and verification status.
- `PHASE-1-AUDIT.md`: original audit, research, removal map, and migration rationale.
- `BRANDING.md`: rebranding/configuration boundary.
- `CATALOG-IMPORT.md`: importer contract and operations.
- `content-todo.md`: production content and provider blockers.

Update these documents in the same change whenever architecture, commands, routes, schema contracts, compatibility decisions, or verified status materially changes.
