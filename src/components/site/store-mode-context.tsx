"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type StoreMode = "b2c" | "b2b";

type StoreModeContextValue = {
  mode: StoreMode;
  setMode: (mode: StoreMode) => void;
  ready: boolean;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const storeModeStorageKey = "zambiel-store-mode-v1";

export function readStoredMode(storage: StorageLike): StoreMode {
  try {
    return storage.getItem(storeModeStorageKey) === "b2b" ? "b2b" : "b2c";
  } catch {
    return "b2c";
  }
}

export function writeStoredMode(storage: StorageLike, mode: StoreMode) {
  try {
    storage.setItem(storeModeStorageKey, mode);
  } catch {
    // Storage may be unavailable in private browsing.
  }
}

const StoreModeContext = createContext<StoreModeContextValue | null>(null);

export function StoreModeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mode, setModeState] = useState<StoreMode>("b2c");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const routeMode = pathname.includes("/b2b-shop") ? "b2b" : "b2c";
      setModeState(routeMode);
      writeStoredMode(localStorage, routeMode);
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const setMode = useCallback((nextMode: StoreMode) => {
    setModeState(nextMode);
    writeStoredMode(localStorage, nextMode);
  }, []);

  const value = useMemo(() => ({ mode, setMode, ready }), [mode, setMode, ready]);
  return <StoreModeContext.Provider value={value}>{children}</StoreModeContext.Provider>;
}

export function useStoreMode() {
  const value = useContext(StoreModeContext);
  if (!value) throw new Error("useStoreMode must be used inside StoreModeProvider");
  return value;
}
