import assert from "node:assert/strict";
import test from "node:test";

import { cn } from "./cn";

test("cn merges theme token classes", () => {
  assert.equal(cn("rounded-control", "rounded-card"), "rounded-card");
  assert.equal(cn("shadow-card", "shadow-card-hover"), "shadow-card-hover");
  assert.equal(cn("min-h-control", "min-h-control-compact"), "min-h-control-compact");
  assert.equal(cn("text-2xs", "text-primary"), "text-2xs text-primary");
  assert.equal(cn("text-sm", "text-2xs"), "text-2xs");
});
