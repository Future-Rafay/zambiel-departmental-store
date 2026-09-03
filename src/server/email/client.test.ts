import assert from "node:assert/strict";
import test from "node:test";
import { Resend } from "resend";

import { getEmailEnv } from "@/config/env";
import { sendEmail } from "@/server/email/client";

test("local contact configuration never redirects private messages and provider failures propagate", async (context) => {
  const values = { NODE_ENV: "development", RESEND_API_KEY: "re_test_stub", EMAIL_FROM: "Zambiel <onboarding@resend.dev>", CONTACT_EMAIL_TO_DEV: "owner@example.com", APP_URL: "http://localhost:3000" };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  try {
    assert.equal(getEmailEnv().CONTACT_EMAIL_TO_DEV, "owner@example.com");
    const post = context.mock.method(Resend.prototype, "post", async (_path: string, body: unknown) => {
      assert.equal((body as { to: string }).to, "customer@example.com");
      assert.equal((body as { from: string }).from, values.EMAIL_FROM);
      return { data: { id: "test-message" }, error: null, headers: null };
    });
    const message = { to: "customer@example.com", subject: "Test", html: "<p>Test</p>", text: "Test" };
    assert.equal((await sendEmail(message))?.id, "test-message");
    post.mock.restore();
    context.mock.method(Resend.prototype, "post", async () => ({ data: null, error: { name: "validation_error" as const, statusCode: 403, message: "Provider rejected recipient" }, headers: null }));
    await assert.rejects(sendEmail(message), /Provider rejected recipient/);
    Object.assign(process.env, { NODE_ENV: "production" });
    assert.throws(() => getEmailEnv(), /DEVELOPMENT_CONTACT_OVERRIDE_NOT_ALLOWED/);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
