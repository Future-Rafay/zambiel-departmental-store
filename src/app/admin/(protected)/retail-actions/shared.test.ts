import assert from "node:assert/strict";
import test from "node:test";

import { categoryModeBlock, productTagNames } from "@/app/admin/(protected)/retail-actions/shared";

test("category mode changes are safe only without incompatible live dependents", () => {
  assert.equal(categoryModeBlock(0, 0), null);
  assert.equal(categoryModeBlock(0, 2), "CATEGORY_HAS_OTHER_MODE_PRODUCTS");
  assert.equal(categoryModeBlock(1, 0), "CATEGORY_HAS_OTHER_MODE_CHILDREN");
  assert.equal(categoryModeBlock(1, 2), "CATEGORY_HAS_MIXED_DEPENDENTS");
});

test("multiple product tags normalize to unique slugs before database writes", () => {
  assert.deepEqual(productTagNames("Seasonal, Gift Ideas, seasonal, , Gift-Ideas"), [
    { slug: "seasonal", name: "seasonal" },
    { slug: "gift-ideas", name: "Gift-Ideas" },
  ]);
});
