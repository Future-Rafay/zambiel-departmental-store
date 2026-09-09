# Zambiel customer app

## Product contract

Android-first customer application in `apps/zambiel-mobile`, using React Native, Expo, TypeScript, and Expo Router. The former staff application was deleted before this work; this is a new customer application, not a migration of that app. Staff compatibility endpoints are not customer APIs.

The app shares the existing Next.js backend and MariaDB through HTTPS APIs. Devices never receive database credentials. Development uses guarded `zambiel_dev`, integration tests use isolated `zambiel_test`, and a public release requires separately configured staging/production data and providers.

Customer scope includes bilingual shopping/search/filtering, arbitrary product variants, local cart, guest/email/Google checkout, hosted Stripe, delivery/pickup, order history/status, push notifications, wishlist, reorder, and multiple saved addresses. Account data is server-owned; carts and recently viewed products remain device-local. New wishlist/reorder/address management screens are app-first. The website remains compatible with the customer's default address.

Shipping is country-based, with no postal-code checkout input. Order accounting remains integer CHF rappen even when Stripe Adaptive Pricing presents another currency. Existing server stock, pricing, promotion, payment, and delivery rules remain authoritative.

No admin dashboard, staff operations, live driver map, reviews, customer cancellation/refund controls, or iOS release is included in the Android milestone.

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
