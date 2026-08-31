import assert from "node:assert/strict";
import test from "node:test";

import { addRecentProduct, parseRecentProducts } from "@/lib/recent-products";

test("recent products keep unique safe slugs in visit order and stay bounded", () => {
  assert.deepEqual(parseRecentProducts("one,two,one,%3Cscript%3E,three"), ["one", "two", "three"]);
  assert.deepEqual(addRecentProduct("two,one,three,four,five,six", "one"), ["one", "two", "three", "four", "five", "six"]);
});
