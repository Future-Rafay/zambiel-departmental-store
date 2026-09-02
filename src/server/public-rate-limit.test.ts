import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";

import { getForwardedClientIp, hashRateLimitIdentifier } from "@/server/public-rate-limit";

test("rate-limit identifiers are scoped, normalized, and never stored raw", () => {
  const secret = "a-test-secret-longer-than-sixteen";
  const first = hashRateLimitIdentifier("email", " User@Example.com ", secret);
  assert.equal(first, hashRateLimitIdentifier("email", "user@example.com", secret));
  assert.notEqual(first, hashRateLimitIdentifier("ip", "user@example.com", secret));
  assert.equal(first.includes("user@example.com"), false);
});

test("forwarded client IP parsing accepts only valid addresses", () => {
  assert.equal(getForwardedClientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })), "203.0.113.9");
  assert.equal(getForwardedClientIp(new Headers({ "x-real-ip": "not-an-ip" })), null);
});
