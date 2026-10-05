# Zambiel production-readiness audit

Audit completed: 2026-10-05

Repository: `D:\zambiel`

Branch at audit start: `main`

## Scope and status model

This audit covers the Next.js storefront and admin, B2C and B2B APIs and services, Prisma schema/migrations/seeds, scripts, the customer Expo application, retained staff compatibility APIs, configuration, deployment inputs, accessibility, SEO, and project documentation. Generated output and third-party source are excluded except for dependency auditing and installed Next.js guidance.

Statuses:

- **Fixed — verified:** implementation and relevant checks passed.
- **Open:** confirmed repository issue remains actionable.
- **Blocked — provider/environment:** credentials, provider state, an authenticated fixture, or an isolated environment was unavailable.
- **Blocked — business decision:** implementation depends on an operational or commercial decision.
- **Accepted — intentional compatibility:** retained deliberately under the project contract.

## Findings

### ZAM-AUD-001 — Vulnerable public web dependencies

- **Severity:** Critical
- **File/path:** `package.json`, `package-lock.json`
- **Problem:** The baseline production audit reported 11 advisories, including one critical, through Next.js 16.3.0, `sanitize-html` 2.17.6, and compatible transitive packages.
- **Why it matters:** These packages process public requests and imported HTML in a commerce application.
- **Recommended fix:** Upgrade supported patch releases together and re-audit rather than applying incompatible overrides.
- **Fix status:** **Fixed — verified**
- **Verification evidence:** `next` and `eslint-config-next` are 16.3.8; `sanitize-html` is 2.18.0; compatible `sharp`, `nanoid`, and `fast-uri` patches were refreshed. Tests, type-check, lint, and the Next.js production build passed. The final production audit no longer lists Next.js, `sanitize-html`, `sharp`, `nanoid`, or `fast-uri`.

### ZAM-AUD-002 — Prisma/MariaDB dependency advisories remain

- **Severity:** High
- **File/path:** `package.json`, `package-lock.json`, `src/server/db.ts`
- **Problem:** The final production audit still reports six packages: one moderate and five high. They are the direct Prisma CLI/adapter packages and transitive `mariadb`, `mysql2`, and `deepmerge-ts` paths.
- **Why it matters:** The MariaDB adapter is runtime-reachable, but npm's proposed remediation is an unsupported Prisma downgrade to 6.19.3.
- **Recommended fix:** Monitor Prisma and the adapter for a compatible release; do not downgrade or force transitive versions that can break database access.
- **Fix status:** **Open**
- **Verification evidence:** Final `npm audit --omit=dev --json`: 0 critical, 5 high, 1 moderate. Full dependency audit: 0 critical, 12 high, 1 moderate.

### ZAM-AUD-003 — Case-sensitive catalog tag relation query

- **Severity:** High
- **File/path:** `src/server/services/retail-catalog.ts`, `prisma/migrations/20260811000000_retail_single_seller/migration.sql`
- **Problem:** The raw filter used `_ProductToProductTag`, while the deployed/imported Linux MySQL relation is lowercase `_producttoproducttag`. Migration history still reflects the differently cased historical table.
- **Why it matters:** Tag filtering can fail only in case-sensitive environments, making local success misleading.
- **Recommended fix:** Keep the parameterized query aligned with the deployed lowercase relation and verify it against a freshly migrated isolated database before reconciling historical casing through a reviewed forward migration.
- **Fix status:** **Blocked — provider/environment**
- **Verification evidence:** Query corrected; type-check, tests, lint, and build passed. The targeted case-sensitive database test remained skipped because no isolated migrated `TEST_DATABASE_URL` was available. No remote schema change was made.

### ZAM-AUD-004 — Credential login and registration lacked throttling

- **Severity:** High
- **File/path:** `src/app/api/auth/credentials/route.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/v1/staff/auth/login/route.ts`, `src/server/public-rate-limit.ts`
- **Problem:** Web login, web registration, and retained staff login did not reuse the durable public rate limiter already used by customer-mobile authentication.
- **Why it matters:** Public credential routes were exposed to avoidable brute force, credential stuffing, and registration abuse.
- **Recommended fix:** Apply the agreed IP/email limits and return one generic 429 contract.
- **Fix status:** **Fixed — verified**
- **Verification evidence:** Login now limits 10 attempts/IP and 8/normalized email per 15 minutes; registration limits 5/IP/hour. Responses use `RATE_LIMITED`, `retryAfterSeconds`, and `Retry-After`. Unit tests cover scoping and response shape; all root tests, type-check, lint, and build passed. Atomic database integration remains part of the isolated-DB verification gap in ZAM-AUD-022.

### ZAM-AUD-005 — Dynamic catalog SEO coverage was incomplete

- **Severity:** Medium
- **File/path:** `src/lib/metadata.ts`, `src/app/[locale]/products/**`, `src/app/[locale]/categories/**`, `src/app/sitemap.ts`
- **Problem:** Product/category listings and details lacked a consistent canonical, locale alternate, Open Graph, Twitter, and image contract; the sitemap contained only static pages.
- **Why it matters:** Search engines could miss or inconsistently index primary store inventory.
- **Recommended fix:** Reuse one localized metadata helper and publish only active public B2C products/categories.
- **Fix status:** **Fixed — verified**
- **Verification evidence:** Metadata unit test passed. Browser checks confirmed localized titles/canonicals for product/category listing and detail routes. `/sitemap.xml` returned 200, contains active product/category URLs in both locales, and excludes B2B. `/robots.txt` returned 200 and disallows admin/API paths. Cart and unknown routes emitted `noindex`.

### ZAM-AUD-006 — Missing App Router failure/loading states

- **Severity:** Medium
- **File/path:** `src/app/[locale]/error.tsx`, `src/app/[locale]/loading.tsx`, `src/app/[locale]/not-found.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`
- **Problem:** The app had no localized route error, loading, or not-found treatment and no global render-failure fallback.
- **Why it matters:** Failures and slow routes fell back to framework defaults instead of accessible recovery within the existing design system.
- **Recommended fix:** Add minimal special files with recovery/navigation actions and no new UI abstraction.
- **Fix status:** **Fixed — verified**
- **Verification evidence:** Next.js recognized all files in the successful production build. A browser request to `/de/does-not-exist` returned 404, localized recovery UI, and `noindex`; it had no horizontal overflow at 375px. A forced production render exception was not introduced solely for testing.

### ZAM-AUD-007 — Product media objects return provider 403 responses

- **Severity:** High
- **File/path:** Catalog media records and S3 delivery configuration; `src/server/storage/s3.ts`
- **Problem:** Browser verification received 403 responses for product objects including `c9f981cf-ab7d-44a6-b636-e11afe75ff45.webp` and `7737241d-f2b0-4c21-ada8-472d2f3ddc76.webp`.
- **Why it matters:** Missing product imagery degrades shopping UX, SEO, and image performance; Next image optimization logs console failures.
- **Recommended fix:** Verify object existence, stored key prefixes, and bucket/CDN read policy. Preserve records until an approved data repair is available.
- **Fix status:** **Blocked — provider/environment**
- **Verification evidence:** Reproduced in the production build at 375px; the existing visual fallback rendered. No media record or provider policy was changed.

### ZAM-AUD-008 — Production push scheduling is not configured in the repository

- **Severity:** High
- **File/path:** `MOBILE-APP.md`, absent `vercel.json`, `src/app/api/internal/mobile-push/route.ts`
- **Problem:** Documentation claimed a registered Vercel schedule, but `vercel.json` was intentionally deleted and no equivalent repository evidence exists.
- **Why it matters:** Queued customer notifications may never dispatch.
- **Recommended fix:** Decide the production scheduler, interval, owner, and cost. Configure it through the authorized deployment process.
- **Fix status:** **Blocked — business decision**
- **Verification evidence:** Documentation now states the actual limitation. No production cron was silently restored.

### ZAM-AUD-009 — Configured remote database is behind application migrations

- **Severity:** High
- **File/path:** `prisma/migrations/20260925000000_add_b2b_foundation`, `prisma/migrations/20260926000000_add_b2b_checkout`
- **Problem:** The configured remote `zambiel` database has two unapplied B2B migrations.
- **Why it matters:** B2B code can fail against a schema without its required tables/columns.
- **Recommended fix:** Back up and deploy the committed migrations through the authorized staging/production release process.
- **Fix status:** **Blocked — provider/environment**
- **Verification evidence:** Final read-only `prisma migrate status` still reports both migrations unapplied. No migration, `db push`, seed, or database-write test was run against the remote database.

### ZAM-AUD-010 — Expo SDK patch versions were inconsistent

- **Severity:** Medium
- **File/path:** `apps/zambiel-mobile/package.json`, `apps/zambiel-mobile/package-lock.json`
- **Problem:** Expo reported mismatched SDK 57 patch packages for `expo`, `expo-constants`, `expo-linking`, `expo-notifications`, and `expo-router`.
- **Why it matters:** Unsupported patch combinations can cause native build, notification, linking, and router failures.
- **Recommended fix:** Align within SDK 57 without a React Native or Expo major migration.
- **Fix status:** **Fixed — verified**
- **Verification evidence:** `npx expo install --check` reports dependencies up to date; mobile type-check and 6/6 tests passed; Android production export completed (3,921 modules, 6 MB Hermes bundle). Expo Doctor improved from 19/21 to 20/21.

### ZAM-AUD-011 — Mobile toolchain advisories and unmaintained HTML renderer

- **Severity:** High
- **File/path:** `apps/zambiel-mobile/package.json`, `apps/zambiel-mobile/package-lock.json`
- **Problem:** The final mobile audit reports 31 advisories (21 high, 10 moderate), largely through Expo/Metro and React Native tooling. Expo Doctor flags `react-native-render-html` as unmaintained.
- **Why it matters:** The toolchain has unresolved upstream risk, while replacing the renderer can change product-description output and native behavior.
- **Recommended fix:** Track supported Expo/React Native patches and separately evaluate a renderer replacement with real-device visual regression coverage. Reject npm's suggested major downgrades.
- **Fix status:** **Open**
- **Verification evidence:** Final mobile production audit and Expo Doctor 20/21. Type-check, tests, and Android export pass.

### ZAM-AUD-012 — Dynamic rendering limits public-page caching

- **Severity:** Medium
- **File/path:** `src/app/layout.tsx`, `src/app/[locale]/layout.tsx`, public product/category pages
- **Problem:** Runtime settings and request headers make almost every public page dynamic. Product metadata and rendering previously repeated the same catalog read.
- **Why it matters:** Dynamic rendering increases request-time database work and limits full-route caching.
- **Recommended fix:** Retain required runtime behavior; measure before changing cache semantics. Deduplicate safe request-local reads now and design explicit runtime-setting invalidation before broader caching.
- **Fix status:** **Open**
- **Verification evidence:** `getRetailProduct` now uses React request-level cache. Final build still correctly classifies public pages as dynamic; no speculative full-route caching was added.

### ZAM-AUD-013 — Admin payment history was loaded as one 500-row graph

- **Severity:** Medium
- **File/path:** `src/app/admin/(protected)/payments/page.tsx`
- **Problem:** The page loaded up to 500 payments plus refunds in one request and had no pagination.
- **Why it matters:** Query cost, memory use, and response size grow with operational history.
- **Recommended fix:** Bound the query and reuse the existing server-page navigation pattern.
- **Fix status:** **Fixed — verified**
- **Verification evidence:** The page now counts records and loads 50 deterministic rows per page with accessible previous/next controls. Type-check, lint, and production build passed. An authenticated production-volume timing run remains a manual check.

### ZAM-AUD-014 — Legacy schema and retained staff APIs resemble dead code

- **Severity:** Low
- **File/path:** Legacy restaurant fields/enums, retained staff API routes, compatibility redirects
- **Problem:** Whole-tree review finds surfaces that would normally be deletion candidates.
- **Why it matters:** Removing them during cleanup would break historical data, old clients, or an expand/contract migration contract.
- **Recommended fix:** Keep them isolated and retire only through a separately reviewed compatibility/migration plan.
- **Fix status:** **Accepted — intentional compatibility**
- **Verification evidence:** Confirmed against `AGENTS.md`, `PROJECT-CONTEXT.md`, schema/route usage, and the Ponytail whole-repository review. No new dependency or abstraction was added for them.

### ZAM-AUD-015 — Default-address uniqueness is application-only

- **Severity:** Medium
- **File/path:** `prisma/schema.prisma`, customer address service operations
- **Problem:** Services clear/set defaults transactionally, but the database does not enforce one default address per customer. Concurrent requests may produce multiple defaults.
- **Why it matters:** Checkout and account screens can disagree about which address to preselect.
- **Recommended fix:** Reproduce in a freshly migrated isolated database; then add the smallest forward-only locking or constraint strategy supported by the deployed MySQL version.
- **Fix status:** **Open**
- **Verification evidence:** Schema/transaction review completed; concurrency reproduction was unavailable without isolated `TEST_DATABASE_URL`.

### ZAM-AUD-016 — Content Security Policy remains broad

- **Severity:** Medium
- **File/path:** `next.config.ts`
- **Problem:** The CSP permits broad HTTPS image/connect sources and inline script/style behavior required by the current app/provider stack.
- **Why it matters:** A tighter policy would reduce XSS and data-exfiltration impact, but changing it blindly can break Next.js, Stripe, analytics, image, or admin-editor behavior.
- **Recommended fix:** Inventory actual production origins and adopt nonce/hash-based restrictions only with browser and provider verification.
- **Fix status:** **Open**
- **Verification evidence:** Configuration and runtime-header review. Existing frame/object protections passed tests; CSP was not weakened.

### ZAM-AUD-017 — Production error monitoring is not evidenced

- **Severity:** Medium
- **File/path:** Application-wide server routes/actions and deployment configuration
- **Problem:** Errors are generally converted to safe responses, but no production error aggregation, alert routing, request correlation, or retention policy is configured in the repository.
- **Why it matters:** Payment, import, notification, and checkout failures can remain invisible until reported by a customer.
- **Recommended fix:** Select an approved provider and data-retention policy, then add server-safe structured reporting without customer/payment secrets.
- **Fix status:** **Blocked — business decision**
- **Verification evidence:** Dependency, configuration, and logging-call inventory; no provider configuration was found.

### ZAM-AUD-018 — External catalog image import accepted unsafe sources

- **Severity:** High
- **File/path:** `src/server/storage/s3.ts`, `src/server/storage/s3.test.ts`
- **Problem:** The importer followed redirects automatically and trusted an HTTP content type, allowing private-network targets or non-image bodies to reach storage.
- **Why it matters:** Admin-triggered imports could be abused for SSRF or to persist mislabeled content.
- **Recommended fix:** Validate scheme/host/address, revalidate redirects, cap size/time/redirects, and verify image signatures before upload.
- **Fix status:** **Fixed — verified**
- **Verification evidence:** The importer now rejects credentials, custom ports, localhost/private/documentation/multicast addresses, revalidates up to three manual redirects, caps downloads at 10 MB/20 seconds, and checks JPEG/PNG/WebP/AVIF signatures. Targeted URL-boundary tests and the full root test/build suite passed. Residual DNS pinning is tracked in ZAM-AUD-023.

### ZAM-AUD-019 — Other admin collections retain hard result caps

- **Severity:** Medium
- **File/path:** Admin product, customer, inventory, discount, and availability list queries
- **Problem:** Several operational screens use high fixed `take` limits or load a full bounded collection without cursor/page navigation.
- **Why it matters:** Records beyond the cap become undiscoverable and payload cost grows before the cap is reached.
- **Recommended fix:** Add pagination only where representative data or a confirmed cap breach justifies it, using the payment-page pattern.
- **Fix status:** **Open**
- **Verification evidence:** Query inventory completed. Only the confirmed 500-row payment hotspot was changed; speculative rewrites were avoided.

### ZAM-AUD-020 — Placeholder social links are publicly rendered

- **Severity:** Medium
- **File/path:** `src/config/store.ts`, `src/components/site/site-shell.tsx`
- **Problem:** Facebook and WhatsApp default to provider homepages rather than approved Zambiel profiles, so the footer renders misleading links.
- **Why it matters:** Customers can be sent away from the brand, and the project policy requires missing social details to remain hidden.
- **Recommended fix:** Supply approved profile/contact URLs or set the missing values to `null` and conditionally hide them.
- **Fix status:** **Blocked — business decision**
- **Verification evidence:** Reproduced in the 375px browser audit. The relevant config file had concurrent user edits and no approved replacement values, so it was not changed.

### ZAM-AUD-021 — Direct presigned uploads trust client-declared image type

- **Severity:** Medium
- **File/path:** `src/app/api/uploads/images/route.ts`, `src/server/storage/s3.ts`
- **Problem:** Presigning validates declared MIME and size, but there is no post-upload signature scan before an object becomes publicly referenced.
- **Why it matters:** An authorized but compromised admin session could upload content that does not match its declared image type.
- **Recommended fix:** Add provider-side validation/quarantine or a server finalization check when the storage workflow can support it; keep current strict extension/MIME/size checks in the interim.
- **Fix status:** **Open**
- **Verification evidence:** Upload route, presign helper, and all upload call sites reviewed. No unsafe weakening was introduced.

### ZAM-AUD-022 — Full database and authenticated-flow regression environment is unavailable

- **Severity:** High
- **File/path:** Database integration tests, authenticated admin/account/checkout flows
- **Problem:** No migrated isolated `TEST_DATABASE_URL` or safe authenticated browser fixture was available. Five database-write suites were skipped.
- **Why it matters:** Atomic throttling, notification claims, replayable Stripe transitions, catalog query plans, address concurrency, and production-volume admin behavior cannot be honestly certified from this environment.
- **Recommended fix:** Provision a disposable lowercase `zambiel_test`, migrate/seed it from scratch, and run authenticated Playwright fixtures without redirecting tests to the remote database.
- **Fix status:** **Blocked — provider/environment**
- **Verification evidence:** Root test result: 60 total, 55 passed, 5 explicitly skipped with isolation guards. Public/guest browser coverage passed; destructive/provider operations were not attempted.

### ZAM-AUD-023 — External image DNS validation is not connection-pinned

- **Severity:** Medium
- **File/path:** `src/server/storage/s3.ts`
- **Problem:** Hostnames are resolved and screened before `fetch`, but the HTTP client performs its own resolution. A hostile DNS service could theoretically rebind between those steps.
- **Why it matters:** The common SSRF paths are blocked, but the highest-assurance network boundary would pin the validated address to the connection while preserving TLS SNI.
- **Recommended fix:** Use a supported fetch dispatcher/agent with a validating lookup callback when the runtime exposes a stable implementation; regression-test public TLS, redirects, and IPv4/IPv6 rebinding.
- **Fix status:** **Open**
- **Verification evidence:** Static network-boundary review. No new HTTP dependency was added solely for a speculative edge case.

## Verification summary

| Check | Final result |
| --- | --- |
| Prisma format/validation/generation | Schema validation and client generation passed; no schema edit required |
| Migration status | 12 migrations found; two B2B migrations remain unapplied remotely; none applied |
| Root tests | 60 total; 55 passed; 5 guarded database suites skipped |
| Root TypeScript | Passed |
| Root lint | Passed without warnings |
| Production build | Passed on Next.js 16.3.8; 87 static-generation entries completed |
| Root production dependency audit | 0 critical, 5 high, 1 moderate; all remaining paths documented in ZAM-AUD-002 |
| Root full dependency audit | 0 critical, 12 high, 1 moderate |
| Mobile dependency alignment | `expo install --check` passed |
| Expo Doctor | 20/21; only `react-native-render-html` maintenance warning remains |
| Mobile TypeScript/tests | Passed; 6/6 tests passed |
| Android export | Passed; 3,921 modules, 6 MB Hermes bundle |
| Mobile dependency audit | 0 critical, 21 high, 10 moderate; documented in ZAM-AUD-011 |
| Browser/public routes | German/English home, product, category, cart, B2B gate, admin redirect, and 404 checked |
| Responsive widths | 320, 375, 768, 1024, and 1440px had no horizontal overflow on the product flow |
| Keyboard/accessibility smoke check | Skip link and semantic landmarks present; mobile nav opens, closes on Escape, and restores trigger focus |
| SEO endpoints | Sitemap/robots 200; active B2C catalog included; B2B excluded; private routes noindex/disallowed |
| Browser console | Only the known S3 403 image failures in ZAM-AUD-007 |
| Git whitespace | `git diff --check` passed; only line-ending conversion notices were emitted |

## Manual/provider checks still required

- Apply the two B2B migrations only through the authorized backed-up release process.
- Run all five guarded database suites and query plans on a freshly migrated isolated `zambiel_test`.
- Verify authenticated account, checkout, B2B approval/shop, and admin CRUD/payment pages with safe fixtures.
- Verify live Stripe Checkout, signed webhooks, refunds, cancellation/restock idempotency, and email delivery.
- Repair/verify the affected S3 objects and run live upload/replacement/import checks.
- Decide and configure production push scheduling; verify Expo/FCM receipts on physical Android devices.
- Provide approved Facebook/WhatsApp URLs or approve hiding them.
- Select production error monitoring and its privacy/retention policy.
- Verify signed Android builds, Google sign-in, deep links, notifications, and store submission on physical devices.

## Final summary

**Audit:** 23 issues found

**Fixed:** 7

**Remaining:** 15

**Accepted compatibility:** 1
