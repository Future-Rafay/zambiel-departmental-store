import assert from "node:assert/strict";
import test from "node:test";

import { resolveProductMediaUrl } from "@/server/storage/s3";

process.env.AWS_REGION = "eu-central-1";
process.env.AWS_ACCESS_KEY_ID = "test";
process.env.AWS_SECRET_ACCESS_KEY = "test";
process.env.S3_BUCKET_NAME = "test";
process.env.S3_PUBLIC_BASE_URL = "https://media.example.com";

test("product media prefers its Shopify source and falls back to storage", () => {
  assert.equal(resolveProductMediaUrl({ sourceUrl: "https://cdn.shopify.com/s/files/item.jpg", objectKey: "Zambiel/item.jpg" }), "https://cdn.shopify.com/s/files/item.jpg");
  assert.equal(resolveProductMediaUrl({ objectKey: "Zambiel/item.jpg" }), "https://media.example.com/Zambiel/item.jpg");
  assert.equal(resolveProductMediaUrl({ objectKey: "/images/placeholder.svg" }), "/images/placeholder.svg");
});
