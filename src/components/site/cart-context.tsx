"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useStoreMode, type StoreMode } from "@/components/site/store-mode-context";

export type CartItem = {
  key: string;
  variantId: string;
  choiceNames?: string[];
  quantity: number;
  productName: string;
  variantName: string;
  unitPriceRappen: number;
  imageUrl?: string | null;
};

type CartContextValue = {
  items: CartItem[];
  addMany: (items: Omit<CartItem, "key">[]) => void;
  remove: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function cartStorageKey(mode: StoreMode) {
  return mode === "b2c" ? "zambiel-cart-v3" : "zambiel-b2b-cart-v1";
}

export function readStoredCart(storage: StorageLike, mode: StoreMode): CartItem[] {
  const key = cartStorageKey(mode);
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value as CartItem[] : [];
  } catch {
    try { storage.removeItem(key); } catch { /* Storage may be unavailable. */ }
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { mode, ready: modeReady } = useStoreMode();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!modeReady) return;
    const key = cartStorageKey(mode);
    const frame = requestAnimationFrame(() => {
      try {
        localStorage.removeItem("zambiel-cart-v1");
        localStorage.removeItem("zambiel-cart-v2");
      } catch { /* Storage may be unavailable. */ }
      setItems(readStoredCart(localStorage, mode));
      setLoadedKey(key);
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, modeReady]);

  useEffect(() => {
    if (loadedKey !== cartStorageKey(mode)) return;
    try { localStorage.setItem(loadedKey, JSON.stringify(items)); } catch { /* Storage may be unavailable. */ }
  }, [items, loadedKey, mode]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addMany: (newItems) =>
        setItems((current) => {
          const next = current.map((item) => ({ ...item }));
          for (const item of newItems) {
            const existing = next.find((candidate) => candidate.variantId === item.variantId);
            if (existing)
              existing.quantity = Math.min(
                99,
                existing.quantity + item.quantity,
              );
            else next.push({ ...item, key: crypto.randomUUID() });
          }
          return next;
        }),
      remove: (key) =>
        setItems((current) => current.filter((item) => item.key !== key)),
      setQuantity: (key, quantity) =>
        setItems((current) =>
          quantity < 1
            ? current.filter((item) => item.key !== key)
            : current.map((item) =>
                item.key === key
                  ? { ...item, quantity: Math.min(99, quantity) }
                  : item,
              ),
        ),
      clear: () => setItems([]),
      count: items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
