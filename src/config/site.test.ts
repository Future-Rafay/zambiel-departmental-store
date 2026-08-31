import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { siteConfig, supportedCurrencies, supportedLocales } from "@/config/site";
import proxy from "@/proxy";

test("site locale and currency use supported single-site values", () => {
  assert.equal(supportedLocales.includes(siteConfig.locale), true);
  assert.equal(supportedCurrencies.includes(siteConfig.currency), true);
});

test("both configured public locales remain routable", () => {
  for (const locale of supportedLocales) {
    const response = proxy(new NextRequest(`https://zambiel.example/${locale}/products?view=all`));
    assert.equal(response.headers.get("location"), null);
  }
});
