import assert from "node:assert/strict";
import test from "node:test";

import {
  replacePendingImageSources,
  uploadProductImage,
  validateProductImage,
} from "@/lib/product-image-upload";

test("product image validation accepts supported files and rejects unsafe input", () => {
  assert.doesNotThrow(() =>
    validateProductImage(new File(["image"], "product.webp", { type: "image/webp" })),
  );
  assert.throws(
    () => validateProductImage(new File([""], "empty.png", { type: "image/png" })),
    /up to 10 MB/,
  );
  assert.throws(
    () => validateProductImage(new File(["svg"], "product.svg", { type: "image/svg+xml" })),
    /up to 10 MB/,
  );
});

test("pending rich-text image sources are replaced without touching other images", () => {
  const html = '<p><img src="blob:first"><img src="https://existing.example/image.jpg"><img src="blob:second"></p>';
  const result = replacePendingImageSources(
    html,
    new Map([
      ["blob:first", "https://media.example.com/first.webp"],
      ["blob:second", "https://media.example.com/second.png"],
    ]),
  );

  assert.equal(
    result,
    '<p><img src="https://media.example.com/first.webp"><img src="https://existing.example/image.jpg"><img src="https://media.example.com/second.png"></p>',
  );
});

test("upload failures remain actionable when authorization returns no JSON", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = (async () =>
    new Response("Service unavailable", { status: 503 })) as typeof fetch;

  await assert.rejects(
    () =>
      uploadProductImage(
        new File(["image"], "product.webp", { type: "image/webp" }),
      ),
    /Upload authorization failed\. Try again\./,
  );
});
