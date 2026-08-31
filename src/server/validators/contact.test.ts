import assert from "node:assert/strict";
import test from "node:test";

import { contactSchema } from "@/server/validators/contact";

const valid = {
  kind: "contact",
  name: "Rafay Nadeem",
  email: "RAFAY@EXAMPLE.COM",
  phone: "",
  subject: "Order question",
  message: "Please help with my recent order.",
  locale: "en",
  website: "",
};

test("contact inquiries accept both supported kinds and normalize email", () => {
  assert.equal(contactSchema.parse(valid).email, "rafay@example.com");
  assert.equal(
    contactSchema.parse({ ...valid, kind: "product_request", subject: "" }).kind,
    "product_request",
  );
});

test("contact inquiries reject honeypot content and unknown kinds", () => {
  assert.equal(contactSchema.safeParse({ ...valid, website: "spam.example" }).success, false);
  assert.equal(contactSchema.safeParse({ ...valid, kind: "newsletter" }).success, false);
});
