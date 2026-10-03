import assert from "node:assert/strict";
import test from "node:test";

import { cartStorageKey, readStoredCart, type CartItem } from "@/components/site/cart-context";
import { readStoredMode, storeModeStorageKey, writeStoredMode } from "@/components/site/store-mode-context";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("store mode defaults safely and keeps B2C and B2B carts isolated", () => {
  const storage = new MemoryStorage();
  const retailItem: CartItem = { key: "retail", variantId: "retail", quantity: 1, productName: "Retail", variantName: "Default", unitPriceRappen: 100 };
  const wholesaleItem: CartItem = { key: "wholesale", variantId: "wholesale", quantity: 5, productName: "Wholesale", variantName: "Case", unitPriceRappen: 500 };

  assert.equal(readStoredMode(storage), "b2c");
  assert.equal(cartStorageKey("b2c"), "zambiel-cart-v3");
  assert.notEqual(cartStorageKey("b2c"), cartStorageKey("b2b"));

  storage.setItem(cartStorageKey("b2c"), JSON.stringify([retailItem]));
  storage.setItem(cartStorageKey("b2b"), JSON.stringify([wholesaleItem]));
  writeStoredMode(storage, "b2b");

  assert.equal(storage.getItem(storeModeStorageKey), "b2b");
  assert.equal(readStoredMode(storage), "b2b");
  assert.deepEqual(readStoredCart(storage, "b2c"), [retailItem]);
  assert.deepEqual(readStoredCart(storage, "b2b"), [wholesaleItem]);

  storage.setItem(storeModeStorageKey, "invalid");
  storage.setItem(cartStorageKey("b2b"), "not-json");
  assert.equal(readStoredMode(storage), "b2c");
  assert.deepEqual(readStoredCart(storage, "b2b"), []);
  assert.equal(storage.getItem(cartStorageKey("b2b")), null);
});

test("store mode and cart reads tolerate unavailable storage", () => {
  const unavailable = {
    getItem() { throw new Error("unavailable"); },
    setItem() { throw new Error("unavailable"); },
    removeItem() { throw new Error("unavailable"); },
  };

  assert.equal(readStoredMode(unavailable), "b2c");
  assert.doesNotThrow(() => writeStoredMode(unavailable, "b2b"));
  assert.deepEqual(readStoredCart(unavailable, "b2c"), []);
});
