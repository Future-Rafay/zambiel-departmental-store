import assert from "node:assert/strict";
import test from "node:test";

import { extractImageUrls, normalizeOptions, parseCsv, parseMoney, sanitizeProductDescription } from "@/server/import/shopify-csv";

test("Shopify CSV parsing preserves quoted commas and line breaks", () => {
  const [row] = parseCsv('Handle,Title,Body (HTML)\r\np-1,"One, two","<p>First</p>\n<p>Second</p>"\r\n');
  assert.deepEqual(row, { Handle: "p-1", Title: "One, two", "Body (HTML)": "<p>First</p>\n<p>Second</p>" });
});

test("money parsing is integer-safe and options remain generic", () => {
  assert.equal(parseMoney("12.95"), 1295);
  assert.equal(parseMoney("12.999"), null);
  assert.deepEqual(normalizeOptions({ "Option1 Name": "Color", "Option1 Value": "Black", "Option2 Name": "Ships From", "Option2 Value": "China" }), [
    { name: "Color", value: "Black" },
    { name: "Ships From", value: "China" },
  ]);
});

test("description sanitization strips styles and only keeps imported images", () => {
  const html = '<p style="color:red">Text<script>alert(1)</script><img src="https://old/image.jpg"></p>';
  assert.deepEqual(extractImageUrls(html), ["https://old/image.jpg"]);
  assert.equal(sanitizeProductDescription(html, new Map([["https://old/image.jpg", "https://media/image.jpg"]])), '<p>Text<img src="https://media/image.jpg" alt="" loading="lazy" /></p>');
});
