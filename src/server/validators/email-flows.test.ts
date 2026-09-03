import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";

import { forgotPasswordSchema, resetPasswordSchema } from "@/server/auth/password-reset";
import { newsletterSchema } from "@/server/validators/newsletter";

test("newsletter and password reset inputs normalize email and reject traps or weak passwords", () => {
  assert.equal(newsletterSchema.parse({ email: " User@Example.com ", locale: "en", website: "" }).email, "user@example.com");
  assert.equal(newsletterSchema.safeParse({ email: "user@example.com", locale: "en", website: "bot" }).success, false);
  assert.equal(forgotPasswordSchema.parse({ email: " User@Example.com ", locale: "de" }).email, "user@example.com");
  assert.equal(resetPasswordSchema.safeParse({ token: "x".repeat(32), password: "too-short" }).success, false);
});
