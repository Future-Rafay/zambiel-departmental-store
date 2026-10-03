import assert from "node:assert/strict";
import test from "node:test";

import {
  categoryHierarchy,
  categoryProductTotals,
  parsePriceRappen,
} from "./catalog-display";

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

test("category hierarchy orders nested categories and identifies descendants", () => {
  const hierarchy = categoryHierarchy([
    { id: "root", parentId: null, name: "Home" },
    { id: "child-b", parentId: "root", name: "Lighting" },
    { id: "child-a", parentId: "root", name: "Furniture" },
    { id: "nested", parentId: "child-a", name: "Chairs" },
  ], ({ name }) => name);

  assert.deepEqual(hierarchy.map(({ id }) => id), ["root", "child-b", "child-a", "nested"]);
  assert.deepEqual(hierarchy.find(({ id }) => id === "nested")?.path, ["Home", "Furniture", "Chairs"]);
  assert.deepEqual(hierarchy.find(({ id }) => id === "root")?.descendantIds, ["child-b", "child-a", "nested"]);
});

test("category hierarchy keeps orphans and cycles finite and visible", () => {
  const hierarchy = categoryHierarchy([
    { id: "orphan", parentId: "missing", name: "Orphan" },
    { id: "cycle-a", parentId: "cycle-b", name: "Cycle A" },
    { id: "cycle-b", parentId: "cycle-a", name: "Cycle B" },
  ], ({ name }) => name);

  assert.deepEqual(hierarchy.map(({ id }) => id), ["orphan", "cycle-a", "cycle-b"]);
  assert.equal(new Set(hierarchy.map(({ id }) => id)).size, 3);
  assert.equal(hierarchy[0].depth, 0);
});
