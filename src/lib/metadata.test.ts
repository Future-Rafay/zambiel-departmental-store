import assert from "node:assert/strict";
import test from "node:test";

import { localizedMetadata } from "@/lib/metadata";

test("localized metadata provides canonical, language, social, and image fields", () => {
  const metadata = localizedMetadata(
    "en",
    "/products/example",
    { de: "Beispiel", en: "Example" },
    { de: "Beschreibung", en: "Description" },
    ["https://media.example.com/example.webp"],
  );

  assert.equal(metadata.title, "Example");
  assert.equal(metadata.description, "Description");
  assert.equal(metadata.alternates?.canonical, "/en/products/example");
  assert.deepEqual(metadata.alternates?.languages, {
    "de-CH": "/de/products/example",
    "en-CH": "/en/products/example",
    "x-default": "/de/products/example",
  });
  assert.equal(metadata.openGraph?.url, "/en/products/example");
  assert.equal(
    metadata.twitter && "card" in metadata.twitter
      ? metadata.twitter.card
      : undefined,
    "summary_large_image",
  );
});
