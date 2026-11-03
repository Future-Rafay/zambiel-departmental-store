# Zambiel production content checklist

- [x] Install the supplied Zambiel logo for shared branding and metadata.
- [ ] Confirm legal name, phone, Swiss address, domain, and remaining social links. Email and Instagram are supplied.
- [ ] Approve German translations for all published catalog and metadata content.
- [ ] Supply reviewed privacy, terms, returns/refunds, delivery, cookie, and payment disclosures.
- [ ] Configure real destination countries with CHF shipping fees, minimums, and free-shipping thresholds.
- [ ] Configure dedicated S3 policy restricted to the selected store prefix.
- [ ] Configure and stage-test Stripe webhook, delayed success, expiry, replay, and full refunds.
- [ ] Keep imported catalog products in draft until commercial review is complete.
- [ ] Verify the zambiel.ch sending domain in Resend and set a production EMAIL_FROM on it (marketing and transactional emails).
- [ ] Confirm Swiss UWG consent rules for marketing emails to registered customers, and mention marketing emails and unsubscribing in the privacy policy.
- [ ] Remove the 150 `delivered+zambiel-mkt-*@resend.dev` test customers (`npm.cmd run marketing:test-customers -- --remove`, plus `--allow-database zambiel` on Railway) before launch.
