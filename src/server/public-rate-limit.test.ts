import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";

import {
  getForwardedClientIp,
  hashRateLimitIdentifier,
  rateLimitedResponse,
} from "@/server/public-rate-limit";

test("rate-limit identifiers are scoped, normalized, and never stored raw", () => {
  const secret = "a-test-secret-longer-than-sixteen";
  const first = hashRateLimitIdentifier("email", " User@Example.com ", secret);
  assert.equal(first, hashRateLimitIdentifier("email", "user@example.com", secret));
  assert.notEqual(first, hashRateLimitIdentifier("ip", "user@example.com", secret));
  assert.equal(first.includes("user@example.com"), false);
  for (const scope of ["ip", "email", "newsletter-ip", "newsletter-email", "password-reset-ip", "password-reset-email", "password-reset-submit-ip", "web-login-ip", "web-login-email", "web-register-ip", "staff-login-ip", "staff-login-email"]) {
    assert.match(hashRateLimitIdentifier(scope, "user@example.com", secret), /^[a-f0-9]{64}$/);
  }
});

test("rate-limit responses expose retry timing without account details", async () => {
  const response = rateLimitedResponse(42);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "42");
  assert.deepEqual(await response.json(), {
    error: "RATE_LIMITED",
    retryAfterSeconds: 42,
  });
});

test("forwarded client IP parsing accepts only valid addresses", () => {
  assert.equal(getForwardedClientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })), "203.0.113.9");
  assert.equal(getForwardedClientIp(new Headers({ "x-real-ip": "not-an-ip" })), null);
});
