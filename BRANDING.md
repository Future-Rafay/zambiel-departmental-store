# Rebranding Zambiel for another Swiss local store

Zambiel is a single-store application. Rebranding does not add sellers, tenants, payouts, or marketplace records.

## Easy configuration

Code and safe defaults live in `src/config/store.ts`. Change store identity, locales, CHF currency, `Europe/Zurich` timezone, country, order prefix, S3 object prefix, metadata, and footer fallback there. The visual theme (corners, colours, fonts, type, spacing, shadows) lives in `src/config/theme.ts` and `src/config/fonts.ts`; see **Re-theme for a new client** below. Replace logo/favicon keys through **Admin → Settings → General** after uploading approved assets. Runtime contact, address, social links, hero copy, and announcement overrides are merged by `src/server/services/store-config.ts`. Colours are no longer a runtime setting: the `SiteSettings` colour columns remain in the schema but are not read.

Update `.env` from `.env.example` for the independent database, Auth.js origin/secret, owner bootstrap, S3, email, Stripe, and app URL. Provider values are deployment configuration, never public content or committed secrets. Delivery rules belong under **Admin → Settings → Delivery zones**; keep postal codes as strings.

## Re-theme for a new client

Edit only these two files. Admin, storefront and emails all follow; no component edits.

| File | What it controls |
|---|---|
| `src/config/theme.ts` | Corners, colours, font names, type scale, weights, line heights, spacing unit, border width, shadows, focus ring, control heights |
| `src/config/fonts.ts` | Which font files `next/font` loads |

**Corners.** Set `corners: "sharp"` (default) or `corners: "rounded"`. Every button, input, select, textarea, card, table, dialog, dropdown and badge switches. To tune the rounded look, edit `radius.rounded` (`control` for controls, `card` for cards/dialogs/tables, `pill` for badges and counters).

**Colours.** Change `colors.primary` and `colors.secondary`. Hover, light/dark and tint shades are derived automatically in `globals.css`. Also review `background`, `surface`, `foreground`, `muted`, `border`, the semantic `success`/`warning`/`error`/`info`, and the order `status` hues. Check text contrast (WCAG AA) for `primaryForeground` on `primary` and `secondaryForeground` on `secondary`.

**Fonts.** In `fonts.ts`, swap the two imports from `next/font/google` (for example `Inter` → `Manrope`) and keep the `variable` names. Then set the same names in `theme.fonts`, which emails use as their font stack.

**Rules.** Components use tokens (`bg-primary`, `text-muted`, `rounded-control`, `rounded-card`, `rounded-pill`, `shadow-card`, `min-h-control`) and shared components from `src/components/ui` (`Button`/`buttonClasses`, `Input`, `Select`, `Textarea`, `Card`, `Badge`, `TableShell`, `Dialog`). `src/config/theme-usage.test.ts` fails the test run when a component hardcodes a radius, palette colour, arbitrary colour/shadow or pixel font size. Its allowlist names the few true circles that stay round.

**Not driven by the theme:** the multi-colour Google sign-in logo, colours a merchant picks inside marketing email content, and the separate customer app in `apps/zambiel-mobile` (it has its own `colors.ts`).

## Content configuration

Homepage copy, promotions, catalog copy and translations, media, SEO overrides, footer, announcements, and legal pages are editorial content. Products and categories belong in their dedicated admin pages; bulk catalog content uses the guarded importer. Missing contact, social, hours, legal, and brand-asset values stay hidden or production-blocking instead of being invented.

## Structural changes

Adding currencies/locales, changing tax/legal models, payment providers, fulfillment lifecycle, authentication/domain/storage providers, multiple addresses/warehouses, or marketplace/multi-store behavior requires schema and code changes. It is not a safe one-file rebrand.

## Client rebrand checklist

1. Create a dedicated lowercase database; never reuse `saltnpepper_dev` or another client's database.
2. Change `src/config/store.ts`, `src/config/theme.ts`, `src/config/fonts.ts`, approved assets, order prefix, and S3 prefix.
3. Configure owner/Auth.js, HTTPS domain, prefix-limited S3 policy, email, and Stripe webhook.
4. Enter verified contact, delivery, footer, SEO, bilingual content, promotions, and legal text.
5. Run migrations and seed only against the guarded development database.
6. Dry-run the catalog, review reports, then apply only with confirmed CHF and independent storage.
7. Run test, typecheck, lint, build, responsive/keyboard journeys, and staging payment/refund/webhook checks.

The customer-only React Native/Expo application is in `apps/zambiel-mobile`; preserve the same identity, fonts, and colors there. The former staff application was already deleted. Customer mobile work must not repurpose the retained staff API or expose admin features. See `MOBILE-APP.md` for the customer-app contract.
