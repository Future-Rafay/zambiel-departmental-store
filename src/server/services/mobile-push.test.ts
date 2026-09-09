import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";

import { isPushDispatcherAuthorized, pushDeviceSchema, pushRetryAt, pushScopeKey } from "@/server/services/mobile-push";

test("mobile push validates tokens, scopes credentials, and bounds retry delay", () => {
  assert.equal(pushDeviceSchema.safeParse({ token: "not-a-token" }).success, false);
  assert.equal(pushDeviceSchema.safeParse({ token: "ExpoPushToken[abc_123]", locale: "en" }).success, true);
  assert.notEqual(pushScopeKey("ExpoPushToken[abc_123]", "user:a"), pushScopeKey("ExpoPushToken[abc_123]", "user:b"));
  const secret = "s".repeat(32);
  assert.equal(isPushDispatcherAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(isPushDispatcherAuthorized(`Bearer ${secret}x`, secret), false);
  assert.equal(pushRetryAt(20, 0).getTime(), 60 * 60_000);
});
