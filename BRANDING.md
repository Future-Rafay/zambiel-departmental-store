# Rebranding Zambiel for another Swiss local store

Zambiel is a single-store application. Rebranding does not add sellers, tenants, payouts, or marketplace records.

## Easy configuration

Code and safe defaults live in `src/config/store.ts`. Change store identity, locales, CHF currency, `Europe/Zurich` timezone, country, order prefix, S3 object prefix, theme colours, fonts, metadata, and footer fallback there. Replace logo/favicon keys through **Admin → Settings → General** after uploading approved assets. Runtime contact, address, social links, hero copy, announcement, and colour overrides are merged by `src/server/services/store-config.ts`.

Update `.env` from `.env.example` for the independent database, Auth.js origin/secret, owner bootstrap, S3, email, Stripe, and app URL. Provider values are deployment configuration, never public content or committed secrets. Delivery rules belong under **Admin → Settings → Delivery zones**; keep postal codes as strings.

## Content configuration

Homepage copy, promotions, catalog copy and translations, media, SEO overrides, footer, announcements, and legal pages are editorial content. Products and categories belong in their dedicated admin pages; bulk catalog content uses the guarded importer. Missing contact, social, hours, legal, and brand-asset values stay hidden or production-blocking instead of being invented.

## Structural changes

Adding currencies/locales, changing tax/legal models, payment providers, fulfillment lifecycle, authentication/domain/storage providers, multiple addresses/warehouses, or marketplace/multi-store behavior requires schema and code changes. It is not a safe one-file rebrand.

## Client rebrand checklist

1. Create a dedicated lowercase database; never reuse `saltnpepper_dev` or another client's database.
2. Change `src/config/store.ts`, approved assets, semantic tokens, order prefix, and S3 prefix.
3. Configure owner/Auth.js, HTTPS domain, prefix-limited S3 policy, email, and Stripe webhook.
4. Enter verified contact, delivery, footer, SEO, bilingual content, promotions, and legal text.
5. Run migrations and seed only against the guarded development database.
6. Dry-run the catalog, review reports, then apply only with confirmed CHF and independent storage.
7. Run test, typecheck, lint, build, responsive/keyboard journeys, and staging payment/refund/webhook checks.

The customer-only React Native/Expo application is in `apps/zambiel-mobile`; preserve the same identity, fonts, and colors there. The former staff application was already deleted. Customer mobile work must not repurpose the retained staff API or expose admin features. See `MOBILE-APP.md` for the customer-app contract.
