# Zambiel customer app

## Product contract

Android-first customer application in `apps/zambiel-mobile`, using React Native, Expo, TypeScript, and Expo Router. The former staff application was deleted before this work; this is a new customer application, not a migration of that app. Staff compatibility endpoints are not customer APIs.

The app shares the existing Next.js backend and MariaDB through HTTPS APIs. Devices never receive database credentials. Development uses guarded `zambiel_dev`, integration tests use isolated `zambiel_test`, and a public release requires separately configured staging/production data and providers.

Customer scope includes bilingual shopping/search/filtering, arbitrary product variants, local cart, guest/email/Google checkout, hosted Stripe, delivery/pickup, order history/status, push notifications, wishlist, reorder, and multiple saved addresses. Account data is server-owned; carts and recently viewed products remain device-local. New wishlist/reorder/address management screens are app-first. The website remains compatible with the customer's default address.

Shipping is country-based, with no postal-code checkout input. Order accounting remains integer CHF rappen even when Stripe Adaptive Pricing presents another currency. Existing server stock, pricing, promotion, payment, and delivery rules remain authoritative.

No admin dashboard, staff operations, live driver map, reviews, customer cancellation/refund controls, or iOS release is included in the Android milestone.

## Customer experience design

The Android app uses the Zambiel green (`#153B35`), gold (`#D6A84B`), warm neutral surfaces, Archivo headings, and Inter body text. Shared mobile primitives control headers, buttons, cards, price display, skeletons, screen states, spacing, and safe-area padding. The app is light-themed for this release.

The five primary destinations are Home, Discover, Cart, Orders, and Account. The safe-area-aware tab bar appears only on those destinations. Product and order details, authentication, addresses, wishlist, support, and checkout use focused stack navigation; product details use a separate safe purchase dock instead of keeping the main tab bar visible.

Home uses `/api/v1/customer/catalog/home` for the native hero, categories, featured products, best sellers, and new arrivals. Recently viewed products stay device-local and are hidden when empty. Discover provides debounced search, an endless two-column product grid, category/availability/price/sort filters, stale-response protection, and distinct initial, next-page, empty, error, and end-of-results states.

Product details combine the primary image, catalog media, and selected variant image into one deduplicated gallery. The page supports paging, thumbnails, full-screen viewing, pinch zoom, arbitrary option groups, unavailable-choice feedback, related products from the existing product response, and recently viewed products excluding the current item. Cart, checkout, orders, wishlist, and account share the same state and interaction patterns. Destructive actions remain separated and confirmed.

TanStack Query caches and deduplicates homepage, order, and wishlist server state. Catalog paging explicitly aborts or ignores stale requests, and the secure session token is hydrated once and retained in memory. The current installed development client uses React Native's built-in image component so JavaScript-only redesign work runs without forcing another native Gradle build; image dimensions and list virtualization remain stable to limit layout work.

### Local Android workflow

Start the Next.js backend from the repository root, then start the already-installed development client from the mobile directory:

```powershell
# Terminal 1: repository root
npm.cmd run dev

# Terminal 2: apps/zambiel-mobile
npm.cmd start
```

Open the Android emulator before starting Metro, then open the installed Zambiel app. Use `npm.cmd run android` only when native dependencies or Android project settings have changed; it invokes a full Gradle build and can take much longer than normal Metro startup. The emulator's `SaltNPepper_App` label is only the local AVD name and is not application branding. The Android emulator reaches a host backend through the configured emulator-safe URL (normally `10.0.2.2`), while a physical phone needs the computer's reachable LAN or HTTPS address.

## Delivery sequence

1. Customer API/authentication contracts, forward migrations, and isolated mobile shell.
2. Native shopping/account screens, wishlist, addresses, and reorder.
3. Checkout interruption recovery, order tracking, and durable push delivery.
4. Android build and regression checks; installable test APK with known provider limits.
5. Production configuration, approved legal content, account-deletion process, signing, store assets, and Google Play preparation. Store publication is a separate release action.

## Integration and safety

- Customer APIs reuse the catalog and ordering services; no duplicate checkout engine or Prisma client.
- Native credentials belong in secure device storage. Password reset and deactivation must revoke native access alongside web sessions.
- Order access requires the owning customer session or a guest tracking credential. Never include guest credentials in push payloads.
- Payment browser returns are navigation signals, not proof of payment. Verified Stripe webhooks remain payment authority; retries must reuse the persisted checkout key.
- Notification delivery is retried independently of the order transaction. Notification permission denial must not block shopping.
- Address changes never rewrite historical order snapshots. Reorder always uses current stock/prices and requires checkout confirmation.
- Keep destructive account/address actions separated from routine actions and confirm them.

## Verification and release inputs

Run root tests/typecheck/lint/build, Prisma validation/generation and guarded migration checks, mobile tests/typecheck/lint, Expo dependency checks, and Android export/build. Exercise account isolation, password-reset revocation, cart recovery, changed stock/prices, guest tracking, interrupted Stripe checkout, delayed/replayed webhooks, and notification retries.

### Stripe webhook setup

Stripe's browser return only reopens the order screen. A signed webhook must reach the backend before a paid Stripe order becomes `PAID` and `CONFIRMED`.

For local website or emulator testing, run the backend and Stripe listener in separate terminals:

```powershell
npm.cmd run dev
stripe login
npm.cmd run stripe:listen
```

Copy the listener's `whsec_...` signing secret to the ignored local `.env` as `STRIPE_WEBHOOK_SECRET`, then restart the backend. Keep the listener running while testing. Use Stripe Dashboard Test mode with test keys; payments made with test keys are not displayed in live mode.

For staging or production, register `https://<origin>/api/webhooks/stripe` in the matching Stripe mode, enable the same event types used by `stripe:listen`, store that endpoint's signing secret as `STRIPE_WEBHOOK_SECRET` in the matching deployment environment, and redeploy. Do not reuse a local listener secret or a secret from the other Stripe mode.

Physical-device Google sign-in, Stripe/webhook payment, Expo/FCM push receipts, and store release require real environment configuration. Do not equate a compiled APK or passing mocked tests with those flows being verified. The test app needs a backend reachable from the device; `localhost` on a phone refers to the phone itself.

Google Play preparation needs a production HTTPS origin, Google OAuth configuration, Expo/FCM credentials, release signing, approved store assets/privacy/legal content, and an operational account-deletion request process with reviewed retention rules. Do not invent business/legal details or silently publish.

## Verified locally

- Prisma schema validation and client generation pass.
- Root typecheck, lint, production build, and 44 unit tests pass (39 exercised without a database; 5 database tests skip by design).
- All 44 tests pass against the migrated local `zambiel_test` database with serial isolation and provider calls disabled.
- Mobile typecheck, six focused tests, Expo Doctor, dependency validation, and Android JavaScript export pass.
- Expo prebuild succeeds. Native Gradle APK assembly is blocked on this Windows host before compilation because Java cannot establish its required loopback connection. No APK is claimed from this run.

Provider-dependent Google sign-in, live Stripe/webhooks, FCM/Expo push receipts, release signing, and Google Play publication remain release-environment checks.

The production push dispatcher is registered in `vercel.json` and requires `CRON_SECRET`. The internal route also supports an explicitly configured external scheduler.

Remaining release inputs are branded square/adaptive/store artwork, an installable signed APK/AAB, production HTTPS origins, Google/Firebase/Expo credentials, physical-device Google/payment/push checks, approved legal and retention content, and the Google Play account/listing. These are not represented as locally verified.
