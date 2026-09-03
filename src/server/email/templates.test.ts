import assert from "node:assert/strict";
import test from "node:test";

import { storeConfig } from "@/config/store";
import { contactAcknowledgementEmail, contactInquiryEmail, newsletterWelcomeEmail, orderConfirmationEmail, orderStatusEmail, passwordResetEmail, staffInvitationEmail } from "./templates";

test("all email families use the configured Zambiel palette, fonts, and safe HTML", () => {
  const contact = { kind: "contact" as const, name: "<script>bad</script>", email: "test@example.com", phone: "", subject: "Test", message: "A test message", locale: "de" as const, website: "" as const };
  const emails = [
    contactInquiryEmail(contact), contactInquiryEmail({ ...contact, kind: "product_request" }), contactAcknowledgementEmail(contact),
    newsletterWelcomeEmail({ locale: "de", unsubscribeUrl: "https://example.com/unsubscribe?token=test" }),
    passwordResetEmail({ locale: "de", resetUrl: "https://example.com/reset?token=test&mode=secure" }),
    staffInvitationEmail({ invitationUrl: "https://example.com/invite" }), orderConfirmationEmail({ orderNumber: "ZAM-000001" }),
    orderStatusEmail({ orderNumber: "ZAM-000001", status: "CANCELLED", locale: "DE" }),
  ];
  for (const email of emails) {
    for (const color of [storeConfig.brand.colors.primary, storeConfig.brand.colors.accent, storeConfig.brand.colors.background, storeConfig.brand.colors.surface, storeConfig.brand.colors.border]) assert.ok(email.html.includes(color));
    for (const font of Object.values(storeConfig.brand.fonts)) assert.ok(email.html.includes(`${font}, Arial, sans-serif`));
    assert.ok(email.text.length > 0);
    assert.ok(!email.html.includes("<script>"));
    assert.ok(email.html.includes('role="presentation"'));
    assert.ok(email.html.includes("max-width:600px"));
  }
  assert.ok(emails[0].html.includes('lang="de"'));
  assert.ok(emails[4].html.includes("token=test&amp;mode=secure"));
});
