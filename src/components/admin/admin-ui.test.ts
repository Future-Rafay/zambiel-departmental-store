import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Notice } from "@/components/admin/admin-ui";

test("duplicate product slugs display an actionable admin error", () => {
  const html = renderToStaticMarkup(createElement(Notice, { error: "PRODUCT_SLUG_TAKEN" }));
  assert.match(html, /This slug is already in use\. Please choose a different slug\./);
});
