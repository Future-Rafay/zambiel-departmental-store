import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { addCartLines, readCart } from "./commerce";
import { api, saveSession, sessionToken } from "./api";
import type { CartLine, Locale, Session, User } from "./types";
import { subscribeToOrders } from "./notifications";

type State = { locale: Locale; setLocale: (v: Locale) => void; cart: CartLine[]; add: (v: CartLine[]) => void; update: (id: string, quantity: number) => void; clear: () => void; user: User | null; ready: boolean; authenticate: (session: Session) => Promise<void>; logout: () => Promise<void> };
const Context = createContext<State | null>(null);
export function AppProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>("de"); const [cart, setCart] = useState<CartLine[]>([]); const [user, setUser] = useState<User | null>(null); const [ready, setReady] = useState(false);
  useEffect(() => { Promise.all([AsyncStorage.getItem("cart"), AsyncStorage.getItem("locale"), sessionToken()]).then(async ([raw, language, token]) => { setCart(readCart(raw ? JSON.parse(raw) : [])); if (language === "en") setLocaleState("en"); if (token) setUser(await api.profile().catch(() => null)); }).finally(() => setReady(true)); }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem("cart", JSON.stringify(cart)); }, [cart, ready]);
  useEffect(() => { if (user) subscribeToOrders(locale).catch(() => undefined); }, [user, locale]);
  const setLocale = (value: Locale) => { setLocaleState(value); AsyncStorage.setItem("locale", value); };
  const value = useMemo<State>(() => ({ locale, setLocale, cart, add: (lines) => setCart((v) => addCartLines(v, lines)), update: (id, quantity) => setCart((v) => quantity < 1 ? v.filter((x) => x.variantId !== id) : v.map((x) => x.variantId === id ? { ...x, quantity: Math.min(20, quantity) } : x)), clear: () => setCart([]), user, ready, authenticate: async (session) => { await saveSession(session); setUser(session.user); }, logout: async () => { await api.logout().catch(() => undefined); await saveSession(null); setUser(null); } }), [locale, cart, user, ready]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() { const value = useContext(Context); if (!value) throw new Error("AppProvider missing"); return value; }
