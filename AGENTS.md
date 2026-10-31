# Zambiel project guide

Read `PROJECT-CONTEXT.md` and `PLAN.md` before making changes. Then read `BRANDING.md` for identity/configuration work, `CATALOG-IMPORT.md` for catalog imports, and `PHASE-1-AUDIT.md` when historical architecture or migration rationale matters.

## Start-of-task checklist

1. Inspect available skills/plugins and use relevant ones. Development work must use the available Ponytail skill before editing.
2. Run `git status --short` and preserve unrelated/user changes.
3. Read the relevant current code at the shared seam before adding a page, service, API, or abstraction.
4. Check the installed Next.js guidance in `node_modules/next/dist/docs/` before Next.js framework changes.
5. Keep changes inside this repository. Do not initialize, clone, copy, or create a sibling project.
6. Never read, print, replace, or commit real secrets. `.env` is local; `.env.example` is documentation only.

## Scope

- This is a single-seller Swiss departmental store. Never add vendor, tenant, organization, commission, payout, or order-splitting architecture.
- Public routes are German/English under `/de` and `/en`; admin is `/admin`. The customer-only Android application lives in `apps/zambiel-mobile` (React Native/Expo). The former staff application was already deleted before customer-app development. Retained staff-mobile endpoints are not customer APIs and must not be reused for customer authentication or app functionality.
- Read `MOBILE-APP.md` for the mobile contract and verification. Devices access the existing backend through customer APIs, never directly through Prisma/database credentials. Preserve website cookie authentication alongside customer mobile sessions. New customer features are app-first; keep website default-address behavior compatible.
- Preserve the shared seams: `src/server/db.ts`; the stable `src/server/services/ordering.ts` facade and its focused `order-*.ts` modules; the stable admin `retail-actions.ts` facade and its domain modules; explicit DTOs; and `resolvePublicImageUrl`.
- Legacy restaurant schema fields and enum members remain temporarily for forward expand/contract compatibility. Do not use them in new behavior, UI, routes, seeds, or APIs; remove them only through a reviewed forward migration after all historical-data requirements are confirmed.

## Configuration and content

- Store defaults live in `src/config/store.ts`; runtime settings merge through `src/server/services/store-config.ts`. Do not scatter brand, currency, timezone, contact, delivery, or storage constants.
- Use CHF integer rappen, UTC storage, and `Europe/Zurich` display. Shipping eligibility and CHF fees are country-based; postal codes are not checkout inputs.
- Missing contact, address, social, hours, legal, media, and commercial claims remain hidden or production-blocking. Do not invent them.
- Product/category content is generic and bilingual. Active products require reviewed German public copy. Variants support arbitrary option values; never reduce them to size/color assumptions.

## Data, ordering, and payments

- Local seed/import targets only lowercase `zambiel_dev` or `zambiel_test`. Never use `saltnpepper_dev`, another client database, or production. Preserve deployed migrations and add forward migrations.
- Stock belongs to variants. Changes require ledger entries and idempotency keys. Stripe reserves stock until signature-verified finalization; cancellation/terminal failure restores it exactly once. Paid orders use the refund-and-cancel flow.
- Delivery: Stripe or COD. Pickup: Stripe or cash at pickup. Server code validates stock, price, promotion, destination country, fulfillment, and payment. Stripe Checkout may present the CHF order in a supported local currency through Adaptive Pricing.
- Retail transitions are `CONFIRMED → PROCESSING → OUT_FOR_DELIVERY → DELIVERED` or `CONFIRMED → PROCESSING → READY_FOR_PICKUP → PICKED_UP`, plus cancellation. Legacy enum values remain only during expand/contract migration.
- Keep network calls outside long database transactions. Secrets and provider identifiers remain server-only.
- The active dev database is remote (Railway, ~0.7 s per query). Never write per-row loops inside a transaction; use set-based statements. Seeding Railway `zambiel` needs the owner's explicit request and `--allow-database zambiel`.
- Email batches: one invalid address makes Resend reject all 100. Keep the pre-send undeliverable-domain check, and never mark Resend-accepted emails `FAILED`.

## Environments and databases

- Root `.env` `DATABASE_URL` targets the remote Railway MySQL database `zambiel` (shared, holds real data). Migrate it only when the owner asks; seed it only with `--allow-database zambiel`. Line 1 of `.env` is a commented local `zambiel_dev` URL: for local work set `$env:DATABASE_URL` from that line in the same command and never print it.
- Local MySQL 8 runs as the Windows service `MySQL80` with `zambiel_dev` (development) and `zambiel_test` (isolated integration tests). `*.integration.test.ts` files skip unless `TEST_DATABASE_URL` points to `zambiel_test` and differs from `DATABASE_URL`.
- Before `prisma migrate deploy` on any database, run `prisma migrate status` and `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`. When a pending migration's changes already exist (Railway drift), mark it with `prisma migrate resolve --applied <name>` instead of re-running it.
- Dev server: `.claude/launch.json` configuration `zambiel-dev` (`npm.cmd run dev`, port 3000). Admin sign-in is typed by the owner.

## Windows and tooling gotchas

- PowerShell 5 `Set-Content`/`Out-File -Encoding utf8` writes a BOM, and MySQL rejects BOM-prefixed migration SQL (P3018, error 1064). Write files with the editor tool or `[IO.File]::WriteAllText(path, text, (New-Object Text.UTF8Encoding $false))`.
- PowerShell shows UTF-8 umlauts and dashes as mojibake (`Ã¼`, `â€”`). The files are correct; do not "fix" them.
- `getEmailEnv()` throws `DEVELOPMENT_CONTACT_OVERRIDE_NOT_ALLOWED` when `CONTACT_EMAIL_TO_DEV` is set outside `NODE_ENV=development` (for example under `node --test`). Tests that render email must delete that variable first.
- One rejected address fails a whole Resend batch of 100. Test recipients use `delivered+label@resend.dev` simulator addresses (they count toward the Resend quota). The `onboarding@resend.dev` sender only reaches the Resend account owner until a sending domain is verified.

## UI and safety

- Reuse the shared UI system. Target WCAG 2.2 AA, semantic labels/errors, keyboard operation, visible focus, reduced motion, and 44px targets. Single-choice options use labelled native radios.
- Archive records with history. Separate destructive controls from routine actions and require confirmation/reason where applicable; refund dialogs show exact CHF amounts.
- Use Lucide icons, no emoji icons. Product/category administration uses dedicated pages.

## Verification

- Non-trivial money, stock, transitions, authorization, import, and payment changes need a runnable regression check.
- Before completion run Prisma validation/generation, fresh guarded migration/seed where available, tests, typecheck, lint, build, and responsive browser checks. State credential/provider-dependent checks honestly.
- Do not claim live Stripe, webhook, refund, destructive admin, concurrent oversell, or production provider behavior without direct evidence from the relevant environment.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
