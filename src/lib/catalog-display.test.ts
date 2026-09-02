import assert from "node:assert/strict";
import test from "node:test";

import { categoryProductTotals, parsePriceRappen } from "./catalog-display";

test("catalog prices ignore empty input and convert valid CHF to rappen", () => {
  assert.equal(parsePriceRappen(undefined), undefined);
  assert.equal(parsePriceRappen(""), undefined);
  assert.equal(parsePriceRappen("  "), undefined);
  assert.equal(parsePriceRappen("14.95"), 1495);
  assert.equal(parsePriceRappen("-1"), undefined);
});

test("category totals include products assigned to every descendant", () => {
  const totals = categoryProductTotals([
    { id: "root", parentId: null, productCount: 1 },
    { id: "child", parentId: "root", productCount: 2 },
    { id: "grandchild", parentId: "child", productCount: 3 },
    { id: "sibling", parentId: "root", productCount: 4 },
  ]);
  assert.equal(totals.get("root"), 10);
  assert.equal(totals.get("child"), 5);
  assert.equal(totals.get("grandchild"), 3);
});
