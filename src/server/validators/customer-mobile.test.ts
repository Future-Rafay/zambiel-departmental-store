import assert from "node:assert/strict";
import test from "node:test";
import { mobileAddressSchema, mobileProfileSchema } from "@/server/validators/customer-mobile";

test("mobile customer input accepts country addresses and rejects incomplete profiles", () => {
  assert.equal(mobileAddressSchema.parse({ label: "Home", recipientName: "Test User", phone: "+41 44 123 45 67", street: "Main 1", city: "Zurich", countryCode: "ch" }).countryCode, "CH");
  assert.equal(mobileProfileSchema.safeParse({ name: "A", phone: "1" }).success, false);
});
