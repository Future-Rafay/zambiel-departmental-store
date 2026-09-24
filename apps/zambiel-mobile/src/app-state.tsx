import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { addCartLines, readCart } from "./commerce";
import { api, saveSession, sessionToken } from "./api";
import type { CartLine, Locale, Session, User } from "./types";
import { subscribeToOrders } from "./notifications";

type LocaleState = { locale: Locale; setLocale: (v: Locale) => void };
type CartState = {
  cart: CartLine[];
  add: (v: CartLine[]) => void;
  update: (id: string, quantity: number) => void;
  clear: () => void;
};
type AuthState = {
  user: User | null;
  ready: boolean;
  authenticate: (session: Session) => Promise<void>;
  logout: () => Promise<void>;
};
type State = LocaleState & CartState & AuthState;
const LocaleContext = createContext<LocaleState | null>(null);
const CartContext = createContext<CartState | null>(null);
const AuthContext = createContext<AuthState | null>(null);
export function AppProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>("de");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("cart"),
      AsyncStorage.getItem("locale"),
      sessionToken(),
    ])
      .then(async ([raw, language, token]) => {
        setCart(readCart(raw ? JSON.parse(raw) : []));
        if (language === "en") setLocaleState("en");
        if (token) setUser(await api.profile().catch(() => null));
      })
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) AsyncStorage.setItem("cart", JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (user) subscribeToOrders(locale).catch(() => undefined);
  }, [user, locale]);
  const setLocale = (value: Locale) => {
    setLocaleState(value);
    AsyncStorage.setItem("locale", value);
  };
  const localeValue = useMemo<LocaleState>(
    () => ({ locale, setLocale }),
    [locale],
  );
  const cartValue = useMemo<CartState>(
    () => ({
      cart,
      add: (lines) => setCart((v) => addCartLines(v, lines)),
      update: (id, quantity) =>
        setCart((v) =>
          quantity < 1
            ? v.filter((x) => x.variantId !== id)
            : v.map((x) =>
                x.variantId === id
                  ? { ...x, quantity: Math.min(20, quantity) }
                  : x,
              ),
        ),
      clear: () => setCart([]),
    }),
    [cart],
  );
  const authValue = useMemo<AuthState>(
    () => ({
      user,
      ready,
      authenticate: async (session) => {
        await saveSession(session);
        setUser(session.user);
      },
      logout: async () => {
        await api.logout().catch(() => undefined);
        await saveSession(null);
        setUser(null);
      },
    }),
    [user, ready],
  );
  return (
    <LocaleContext.Provider value={localeValue}>
      <CartContext.Provider value={cartValue}>
        <AuthContext.Provider value={authValue}>
          {children}
        </AuthContext.Provider>
      </CartContext.Provider>
    </LocaleContext.Provider>
  );
}
export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("AppProvider missing");
  return value;
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("AppProvider missing");
  return value;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AppProvider missing");
  return value;
}
export function useApp(): State {
  return { ...useLocale(), ...useCart(), ...useAuth() };
}
