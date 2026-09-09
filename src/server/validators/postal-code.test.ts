import assert from "node:assert/strict";
import test from "node:test";

import { postalCodeValueSchema } from "@/server/validators/postal-code";

test("postal codes preserve leading zeroes and normalize letters and spaces", () => {
  for (const [input, expected] of [
    ["8154", "8154"],
    ["01234", "01234"],
    ["sw1a   1aa", "SW1A 1AA"],
    [" k1a 0b1 ", "K1A 0B1"],
  ]) assert.equal(postalCodeValueSchema.parse(input), expected);

  for (const input of ["", "A/B", "-8154", "12345678901234567"])
    assert.equal(postalCodeValueSchema.safeParse(input).success, false);
});
