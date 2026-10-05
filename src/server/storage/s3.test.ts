import assert from "node:assert/strict";
import test from "node:test";

import {
  isPrivateNetworkAddress,
  parseExternalImageUrl,
  resolveProductMediaUrl,
} from "@/server/storage/s3";

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

test("external image imports reject local and credential-bearing URLs", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.2", "::1", "fc00::1", "fe80::1"]) {
    assert.equal(isPrivateNetworkAddress(address), true);
  }
  assert.equal(isPrivateNetworkAddress("8.8.8.8"), false);
  assert.throws(() => parseExternalImageUrl("file:///etc/passwd"), /HTTP or HTTPS/);
  assert.throws(() => parseExternalImageUrl("http://127.0.0.1/image.png"), /Private image hosts/);
  assert.throws(() => parseExternalImageUrl("https://user:pass@example.com/image.png"), /credentials/);
  assert.equal(parseExternalImageUrl("https://cdn.shopify.com/image.png").hostname, "cdn.shopify.com");
});
