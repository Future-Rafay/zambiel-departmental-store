import assert from "node:assert/strict";
import test from "node:test";

import { theme, themeCssVariables } from "./theme";

test("the corners switch drives every radius token", () => {
  const sharp = themeCssVariables({ ...theme, corners: "sharp" });
  assert.equal(sharp["--t-radius-control"], "0px");
  assert.equal(sharp["--t-radius-card"], "0px");
  assert.equal(sharp["--t-radius-pill"], "0px");

  const rounded = themeCssVariables({ ...theme, corners: "rounded" });
  assert.equal(rounded["--t-radius-control"], theme.radius.rounded.control);
  assert.equal(rounded["--t-radius-pill"], theme.radius.rounded.pill);
});

test("theme variables cover colours, type, spacing and controls", () => {
  const vars = themeCssVariables();
  assert.equal(vars["--t-color-primary"], theme.colors.primary);
  assert.equal(vars["--t-color-surface-muted"], theme.colors.surfaceMuted);
  assert.equal(vars["--t-status-processing"], theme.colors.status.processing);
  assert.equal(vars["--t-text-sm"], "0.875rem");
  assert.equal(vars["--t-shadow-card-hover"], theme.shadows.cardHover);
  assert.equal(vars["--t-control-height"], theme.controls.height);
  assert.equal(vars["--t-spacing"], theme.spacing);
  for (const value of Object.values(vars)) assert.ok(value && !value.includes("undefined"));
});
