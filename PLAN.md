# Zambiel implementation plan

## Product contract

Zambiel is one Swiss store and one seller. German is primary, English secondary, money is integer CHF rappen, time displays in `Europe/Zurich`, delivery is destination-country based, and the customer app supports multiple saved addresses with a default used by the website. Do not add vendors, tenants, organizations, payouts, warehouses, backorders, or partial-refund restocking.

## Implemented foundation

- Central typed store defaults in `src/config/store.ts`, runtime merge in `src/server/services/store-config.ts`, and rebranding instructions in `BRANDING.md`.
- Forward retail migration adds product lifecycle, category hierarchy, arbitrary options, ordered media, variant pricing/barcode/stock, inventory ledger, retail statuses, and one-address constraint while preserving deployed migration history.
- `src/server/services/ordering.ts` remains the stable public ordering facade. Focused `order-*.ts` modules own quotes, reads, notification claims, and Stripe lifecycle without changing callers; COD and cash-at-pickup remain retail flows.
- Localized product, category, search, cart, checkout, account, and tracking routes; dedicated product/category/inventory admin workflows plus customers, discounts, payments, settings, orders, and audit surfaces.
- Localized contact pages, durable contact/product-request delivery controls, compact database-backed filters, descendant-aware category counts, product breadcrumbs/gallery/sharing/recommendations/history, and a richer branded homepage/footer.
- Immediate newsletter subscription/unsubscribe and localized password recovery reuse the existing Resend, rate-limit, session, and password-token seams without adding campaign tooling.
- Safe catalog deletion hides products, variants, and categories operationally while preserving historical relations. Inventory defaults to low/empty stock and admin money fields accept decimal CHF while retaining integer-rappen storage.
- Product/category forms generate slugs from English names. Product descriptions use a minimal bilingual TipTap editor with sanitized HTML and store-owned uploaded images.
- Product-description image uploads expose an accessible in-toolbar progress state while the existing upload request runs.
- Checkout and saved delivery addresses use a configured destination country without postal-code input. Each country owns its CHF minimum, fee, and optional free-shipping threshold; Stripe Adaptive Pricing handles supported local-currency presentation without changing stored CHF totals.
- Inter headings, Archivo body text, the supplied Zambiel marks, subtle paper grain, sharper commerce panels, and accessible manual hero/gallery/navigation controls.
- Checkout, ordering, retail actions, product editing, and admin order history have focused modules while their established entry points remain compatible.
- Guarded Shopify importer and report workflow documented in `CATALOG-IMPORT.md`. Imports remain draft and start at 25 units; the guarded demo seed publishes the reviewed local fixture set.
- Restaurant WordPress/contact/map/menu content was removed; `/de/menu` and `/en/menu` remain redirects to products for compatibility.

## Production blockers

See `content-todo.md`. The independent local `zambiel_dev` database is established. Approved legal/German content, dedicated S3 policy, real shipping-country rules, Stripe Adaptive Pricing staging tests, and deployment credentials are still required before production enablement.

## Verification gate

Run Prisma format/validate/generate and fresh-database migration/seed; importer dry-run and repeatability checks; unit/integration tests; typecheck, lint, build; responsive and keyboard browser journeys; and Stripe webhook/refund staging.

### Follow-up: country shipping and editor uploads (2026-09-09)

- Product-description image uploads expose an accessible uploading status and disable duplicate upload actions while the request is running.
- Checkout, saved addresses, server quotes, order validation, and admin settings now use destination-country shipping rules in CHF without a postal-code requirement. Stripe Checkout keeps CHF as the order currency and enables Adaptive Pricing for eligible local-currency presentation.
- Prisma migration/status, 44 tests (39 passed, 5 isolated-database skips), typecheck, build, diff checks, and responsive checkout verification passed. Lint has no errors and one unrelated category-card warning. The guarded seed applied the shipping configuration before encountering an existing zero-stock demo movement; authenticated admin and live Stripe presentment still require staging verification.
- The shared header now rotates automatically through every active shipping country's localized delivery information, while respecting reduced-motion preferences.
- Local Stripe test payments require `npm run stripe:listen` beside the backend with its signing secret configured as `STRIPE_WEBHOOK_SECRET`; Test mode must be enabled in Stripe Dashboard.
- Three completed test payments that were pending locally have been recovered through the signature-verified webhook route. The latest recovery was verified paid/confirmed and idempotent. Continuous delivery still requires the listener or a public HTTPS endpoint.

## Current verification (2026-09-03)

### Follow-up: email forms and footer (2026-09-04)

- Public page shells now align to 7xl, with compact authentication cards inside. The footer has stronger Zambiel branding and no About link; Contact uses runtime settings and contains no live-chat card. Facebook, Instagram, and WhatsApp icons use user-requested platform-homepage defaults, with configured Facebook/Instagram profiles taking precedence.
- Every email family shares configured brand colors and Inter/Archivo fallback stacks in an email-safe 600px table layout, with localized shell text and accessible action links. The website's 7xl width does not apply to inbox messages.

- Fixed the rate-limit key overflow at the shared helper with a 64-character scoped HMAC; no migration or counter truncation.
- Local development uses the Resend onboarding sender and a development-only contact-recipient override; private/customer recipients are not redirected and production rejects the override.
- Live contact and newsletter API checks returned HTTP 200 for the approved Gmail, including contact acknowledgement. This supersedes the previous invalid-key result; inbox receipt and arbitrary-recipient delivery are not claimed.
- Removed chat placeholders, linked localized returns drafts, and added checkout/newsletter legal links. Reviewed production legal copy remains outstanding.
- Guarded local database checks passed long-scope throttling, concurrent limits, and expiry. Only generated test counters were removed. Unrelated UI edits remain preserved.
- Verification: 38 passing tests and 5 isolated-database skips, passing typecheck/build/diff checks, and zero lint errors (one existing category-card unused-import warning). German/English returns/footer checks passed at 375/1440 with no overflow or chat placeholder. Social-link follow-up passed typecheck and targeted lint. Inbox-client rendering remains unverified.

- Eight migrations now define the independent Zambiel schema. The public-rate-limit and newsletter-subscriber migrations are applied to local `zambiel_dev`.
- Catalog: 50 imported products, 223 imported variants, 950 Shopify-source media rows, 62 active categories, 52 active products, and 225 active variants. Stock is 5,568 on hand and 1 reserved after demo order movements.
- Demo business data: 5 customers, 2 delivery zones, 10 orders, `WELCOME10`, 1 successful refund, 10 notifications, 10 audits, and 12 idempotent order movements.
- Prisma format/validation/generation, 41 tests (36 passing and 5 isolated-database skips), typecheck, clean lint, production build, and `git diff --check` pass.
- Authenticated browser checks pass inventory defaults, decimal CHF fields, rich-editor controls, safe delete controls, and slug generation; cart/checkout layouts pass at 375/768/1024/1440 without horizontal overflow. Remote S3 image 403 responses remain an operational provider issue; tracking with an authorized fixture and live rich-image upload were not exercised.
- The requested labelled live Resend check failed at the provider with HTTP 401 because the configured API key is invalid. Mocked-delivery tests pass, but live email is a release blocker until the key is replaced.
- Superseded product decision (2026-08-31): no React Native app. The 2026-09-09 customer-app scope is documented in `MOBILE-APP.md`; the former staff app was already deleted.
- Destructive admin mutations, live Stripe/webhook/refund, concurrent oversell, live S3 editor upload, and production-provider checks remain unverified.
