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
- Public routes are German/English under `/de` and `/en`; admin is `/admin`. Zambiel has no planned React Native application. Existing native artifacts and staff-mobile endpoints are frozen legacy code: do not transform, extend, advertise, or verify them as Zambiel functionality without a separately approved removal or migration task.
- Preserve the shared seams: `src/server/db.ts`; the stable `src/server/services/ordering.ts` facade and its focused `order-*.ts` modules; the stable admin `retail-actions.ts` facade and its domain modules; explicit DTOs; and `resolvePublicImageUrl`.
- Legacy restaurant schema fields and enum members remain temporarily for forward expand/contract compatibility. Do not use them in new behavior, UI, routes, seeds, or APIs; remove them only through a reviewed forward migration after all historical-data requirements are confirmed.

## Configuration and content

- Store defaults live in `src/config/store.ts`; runtime settings merge through `src/server/services/store-config.ts`. Do not scatter brand, currency, timezone, contact, delivery, or storage constants.
- Use CHF integer rappen, UTC storage, `Europe/Zurich` display, and normalized string postal codes.
- Missing contact, address, social, hours, legal, media, and commercial claims remain hidden or production-blocking. Do not invent them.
- Product/category content is generic and bilingual. Active products require reviewed German public copy. Variants support arbitrary option values; never reduce them to size/color assumptions.

## Data, ordering, and payments

- Local seed/import targets only lowercase `zambiel_dev` or `zambiel_test`. Never use `saltnpepper_dev`, another client database, or production. Preserve deployed migrations and add forward migrations.
- Stock belongs to variants. Changes require ledger entries and idempotency keys. Stripe reserves stock until signature-verified finalization; cancellation/terminal failure restores it exactly once. Paid orders use the refund-and-cancel flow.
- Delivery: Stripe or COD. Pickup: Stripe or cash at pickup. Server code validates stock, price, promotion, postal zone, fulfillment, and payment.
- Retail transitions are `CONFIRMED → PROCESSING → OUT_FOR_DELIVERY → DELIVERED` or `CONFIRMED → PROCESSING → READY_FOR_PICKUP → PICKED_UP`, plus cancellation. Legacy enum values remain only during expand/contract migration.
- Keep network calls outside long database transactions. Secrets and provider identifiers remain server-only.

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
