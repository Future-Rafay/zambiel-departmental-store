# Zambiel technical audit

Date: 2026-08-31
Scope: the post-change Next.js storefront and shared server/admin seams. Generated Prisma output and `apps/saltnpepper-staff-android` are excluded. This report records findings only; none of its recommendations were applied.

## Executive summary

The storefront build, typecheck, lint, Prisma validation/generation, catalogue statistics, and focused tests pass. The new homepage, categories, compact product filters, product detail additions, contact page, navigation, and footer were exercised in the production build from 375px through 1440px without horizontal overflow. The strongest remaining risks are public-form abuse controls, broken source media records, and concurrency/feedback edges in the mature ordering code. The new public pages are already appropriately split; the largest maintainability work remains in ordering, retail admin actions, checkout, and the admin shell.

## Ranked findings

### High

1. **Security — the public contact endpoint can be used to consume email quota and send acknowledgements to arbitrary addresses.** `src/app/api/v1/public/contact/route.ts` checks origin, validates with Zod, and uses a honeypot, but it has no server-side rate limit. Origin headers are not an abuse boundary for scripted clients, and every accepted request attempts both an internal delivery and an external acknowledgement. Add a bounded IP/email rate limit before enabling production Resend delivery; keep the acknowledgement best-effort.

### Medium

2. **Correctness/content — two active catalogue media objects return HTTP 403.** Production browser checks observed failures for `Zambiel/products/c9f981cf-ab7d-44a6-b636-e11afe75ff45.webp` and `Zambiel/products/7737241d-f2b0-4c21-ada8-472d2f3ddc76.webp`. `StorefrontImage` now gives visitors a visual placeholder, but the initial failed request still reaches the console and the broken URL can leak into Pinterest sharing. Repair the object permissions/keys or replace these records with their reviewed source URLs, then run an automated media-head check over active catalogue records.

3. **Performance — availability and price sorting load the complete matching product graph into memory.** `src/server/services/retail-catalog.ts:131-142` omits database pagination whenever `availableOnly`, `price-asc`, or `price-desc` is selected, includes all media/options/variants, then filters, sorts, and slices in Node. This is acceptable at 51 active products but scales with the full catalogue. Move availability and minimum-price ordering into a database-level aggregate/query before catalogue growth makes this measurable.

4. **Correctness — notification deduplication does not atomically claim a delivery.** `src/server/services/ordering.ts:138-166` upserts a row and checks only `SENT`; two workers can both observe a non-sent row and deliver the same message. Add an atomic pending-to-processing claim or an outbox worker with a unique claim before sending.

5. **Correctness/UX — an order transition can commit and still be reported as failed.** `advanceOrder` commits the transaction and then awaits `sendOrderNotification` at `src/server/services/ordering.ts:561-584`. A mail-provider error rejects the admin action after the status already changed, encouraging a retry that then reports a version conflict. Treat the transition as authoritative and record/retry notification failure independently, as the Stripe path already does.

6. **Product policy — the admin shell still promotes a Zambiel staff app.** `src/components/admin/admin-shell.tsx:196-197` and `src/app/admin/(protected)/template.tsx:20` expose an APK download/unavailable control and Zambiel Android wording. This conflicts with the newly documented decision that native artifacts are frozen legacy material and are not Zambiel functionality. Remove the web promotion/configuration in the next approved cleanup without modifying the frozen native directory.

7. **Accessibility — the admin mobile drawer is not a complete modal interaction.** `src/components/admin/admin-shell.tsx` presents the drawer as generic containers, does not trap/restore focus or close on Escape, and its icon-only close button has no accessible name. Use the already-installed dialog primitive or implement equivalent dialog semantics and keyboard handling.

8. **Reliability — checkout quote requests can resolve out of order.** `src/components/site/checkout-form.tsx:118-174` starts asynchronous quote requests without an `AbortController` or request sequence. A slower earlier postcode/promotion response can replace a newer quote. Cancel the previous request or accept only the latest request id.

### Low

9. **Development truthfulness — placeholder email mode reports delivery success.** `src/server/email/client.ts:18-20` returns `placeholder-not-sent`, and the contact route returns `{ sent: true }`. Production configuration validation blocks placeholder credentials, but local/staging UI can still claim a message was sent. Return an explicit disabled result outside tests or surface a non-production message.

10. **Performance — the root layout forces every route dynamic.** `src/app/layout.tsx:11` exports `dynamic = "force-dynamic"`, preventing static output and broader caching even for legal/contact content. Reassess which runtime configuration truly needs request-time rendering and move the dynamic boundary down to those layouts/pages.

11. **Data completeness — all 62 active categories currently use the placeholder.** The category component behaves correctly, but current records have no usable configured category image. Populate reviewed category media before treating the image-led category experience as complete.

12. **Audit consistency — product availability change and audit logging are separate writes.** `src/server/services/ordering.ts:587-598` updates the product and then writes its audit row outside a transaction. A second-write failure leaves an unlogged state change. Put both writes in one short transaction.

## Area reassessment

- **Homepage:** the route is 46 lines and delegates to the 49-line hero and 59-line content sections. Manual slider controls, focusable actions, reduced-motion-safe CSS, fallbacks, and 375/768/1024/1440 layouts passed. No further component split is justified now. Repair the two source media records and populate category imagery.
- **Product filters:** the former arbitrary option facets are gone. One native `details` disclosure contains search, category, CHF range, availability, sort, apply, and clear controls; no misleading imported `Color` values remain. Database-side price/availability pagination is the next scaling task.
- **Checkout form:** server-authoritative quoting/order creation remains the correct seam and native labelled radio cards are retained. Address request races first, then split presentation only; do not duplicate validation or pricing in the client.
- **Ordering service:** money, inventory reservations, Stripe finalization, and network-outside-transaction structure remain sound in static review. The skipped isolated-database test means webhook replays, concurrent oversell, refunds, and provider behavior are still not proven here. Prioritize notification claiming and post-commit error semantics.
- **Retail actions:** authorization and Zod checks are present, but product/category, variants/options/media, inventory, and order actions share one 569-line file. Split by those existing domains; do not introduce repository interfaces or generic action factories.
- **Admin shell:** keep the current design system, but remove the legacy app promotion and extract a shared navigation renderer plus an accessible mobile-dialog shell.
- **Other long files:** import tooling is intentionally cohesive but can isolate CSV parsing/validation from apply/reporting. The admin service should split reads, catalogue mutations, and refund lifecycle only when those areas are changed.

## Handwritten files at least 250 lines

| Lines | File | Suggested boundary |
| ---: | --- | --- |
| 616 | `src/server/services/ordering.ts` | Quote/catalog validation; order creation/reservation; Stripe event lifecycle; read DTOs/admin transitions. Keep transactions and idempotency rules colocated with each lifecycle. |
| 569 | `src/app/admin/(protected)/retail-actions.ts` | Product/category actions; variant/option actions; media actions; inventory/order actions. |
| 555 | `src/components/site/checkout-form.tsx` | Quote/controller hook; customer/address fields; fulfillment/payment cards; totals/submit panel. Keep the payload contract in one controller. |
| 547 | `scripts/import-products.ts` | CSV parse/normalization; validation/reporting; guarded database apply. |
| 377 | `src/components/admin/retail-product-form.tsx` | Product copy/SEO; merchandising/tags; destructive archive panel. |
| 327 | `src/components/admin/admin-shell.tsx` | Shared navigation list; desktop sidebar; accessible mobile drawer; account menu. |
| 281 | `src/app/admin/(protected)/orders/page.tsx` | Filter/query controls and order results table. |
| 270 | `src/server/services/admin.ts` | Admin reads; catalogue/settings mutations; refund/cancellation lifecycle. |
| 262 | `src/app/globals.css` | Keep tokens/base/focus together; move page-specific animation/component rules beside their owning component only when next edited. |

## Ponytail simplification pass

1. `delete:` unused legacy `SocialLinks` component with stale Foodeez labels. Replacement: nothing. [`src/components/site/social-links.tsx`]
2. `shrink:` desktop and mobile admin navigation duplicate group/item rendering. Replacement: one local navigation renderer used by both shells. [`src/components/admin/admin-shell.tsx`]
3. `native:` custom click-outside-only mobile/admin overlays omit platform dialog behavior. Replacement: the installed Radix dialog primitive for focus trap, Escape, aria-modal, and focus restoration. [`src/components/admin/admin-shell.tsx`]
4. `delete:` frozen staff-APK promotion and its web configuration path contradict the no-app product decision. Replacement: nothing in the web UI; leave native files frozen. [`src/components/admin/admin-shell.tsx`, `src/app/admin/(protected)/template.tsx`]
5. `shrink:` repeated admin action concerns live in one catch-all module. Replacement: four domain files using the existing direct Prisma/Zod patterns, with no generic action framework. [`src/app/admin/(protected)/retail-actions.ts`]

`net: -215 lines, -0 deps possible.` The estimate assumes the approved cleanup and domain split improve locality without adding a generic action framework.

## Verification gaps

- No real Resend message was sent; provider credentials and production-domain deliverability were intentionally not exercised.
- The isolated Stripe/database integration test was skipped because `TEST_DATABASE_URL` was not configured. Live Stripe checkout, signed webhook delivery, refund/cancel, delayed payment, and concurrent oversell remain unverified.
- Authenticated/destructive admin flows were inspected statically, not executed against production data.
- Browser checks covered representative German and English routes and 375/768/1024/1440 widths; assistive-technology screen-reader output and multiple physical browsers/devices were not tested.
- The two HTTP 403 catalogue media records generate console errors even though the visual placeholder renders.
- Category placeholder behavior was verified; no configured category image was available to verify the positive path.

## Recommended next-round order

1. Add contact submission rate limiting and make placeholder email mode truthful.
2. Repair/validate active catalogue media and add reviewed category imagery.
3. Fix notification claiming and post-commit order-action feedback; then run isolated concurrent/payment regression checks.
4. Remove the frozen app promotion and correct the admin mobile drawer accessibility.
5. Move product availability/price filtering to database pagination before catalogue growth.
6. Split the listed long files along the boundaries above, running focused tests after each domain extraction.
7. Narrow the global dynamic-rendering boundary after measuring route caching requirements.
