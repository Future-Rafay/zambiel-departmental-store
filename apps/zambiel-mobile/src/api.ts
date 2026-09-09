import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type { Address, Category, CheckoutInput, Locale, MobileConfig, Order, OrderReceipt, Product, Quote, Session, User } from "./types";

const baseUrl = String(Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const tokenKey = "zambiel.session";
export async function sessionToken() { return SecureStore.getItemAsync(tokenKey); }
export async function saveSession(session: Session | null) { session ? await SecureStore.setItemAsync(tokenKey, session.token) : await SecureStore.deleteItemAsync(tokenKey); }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!baseUrl) throw new Error("API_URL_MISSING");
  const token = await sessionToken();
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? `HTTP_${response.status}`);
  return body as T;
}
const customer = "/api/v1/customer";
type CatalogPage = { items: Product[]; page: number; pageCount: number; total: number };
export const api = {
  config: () => request<MobileConfig>("/api/v1/public/config").then((value) => ({ ...value, countries: value.countries ?? [{ countryCode: "CH", nameDe: "Schweiz", nameEn: "Switzerland", deliveryFeeRappen: 0, minimumSubtotalRappen: 0 }] })),
  categories: (locale: Locale) => request<{ categories: Category[] }>(`${customer}/catalog/categories?locale=${locale}`).then((x) => x.categories),
  productsPage: (query = "") => request<CatalogPage>(`${customer}/catalog${query ? `?${query}` : ""}`),
  products: (query = "") => request<CatalogPage>(`${customer}/catalog${query ? `?${query}` : ""}`).then((x) => x.items),
  product: (slug: string, locale: Locale) => request<{ product: Product }>(`${customer}/catalog/products/${encodeURIComponent(slug)}?locale=${locale}`).then((x) => x.product),
  login: (email: string, password: string) => request<Session>(`${customer}/auth/login`, { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) => request<Session>(`${customer}/auth/register`, { method: "POST", body: JSON.stringify({ name, email, password }) }),
  forgotPassword: (email: string) => request<{ accepted: true }>(`${customer}/auth/forgot-password`, { method: "POST", body: JSON.stringify({ email, website: "" }) }),
  google: (idToken: string) => request<Session>(`${customer}/auth/google`, { method: "POST", body: JSON.stringify({ idToken }) }),
  logout: () => request<void>(`${customer}/auth/logout`, { method: "POST" }),
  profile: () => request<{ user: User }>(`${customer}/auth/me`).then((x) => x.user),
  addresses: () => request<{ addresses: Address[] }>(`${customer}/account/addresses`).then((x) => x.addresses),
  saveAddress: (value: Partial<Address>) => request<{ address: Address }>(`${customer}/account/addresses${value.id ? `/${value.id}` : ""}`, { method: value.id ? "PATCH" : "POST", body: JSON.stringify(value) }).then((x) => x.address),
  deleteAddress: (id: string) => request<void>(`${customer}/account/addresses/${id}`, { method: "DELETE" }),
  wishlist: (locale: Locale) => request<{ products: Product[] }>(`${customer}/wishlist?locale=${locale}`).then((x) => x.products),
  toggleWishlist: (productId: string, saved: boolean) => saved ? request<void>(`${customer}/wishlist/${productId}`, { method: "DELETE" }) : request<void>(`${customer}/wishlist`, { method: "POST", body: JSON.stringify({ productId }) }),
  deletionRequest: () => request<void>(`${customer}/account/deletion-request`, { method: "POST", body: JSON.stringify({ reason: null }) }),
  quote: (value: CheckoutInput) => request<Quote>("/api/v1/customer/quote", { method: "POST", body: JSON.stringify(value) }),
  checkout: async (value: CheckoutInput) => { const keyName = "zambiel.pending-checkout"; const checkoutKey = await SecureStore.getItemAsync(keyName) ?? value.checkoutKey; await SecureStore.setItemAsync(keyName, checkoutKey); const receipt = await request<OrderReceipt>("/api/v1/customer/orders", { method: "POST", body: JSON.stringify({ ...value, checkoutKey }) }); await SecureStore.deleteItemAsync(keyName); return receipt; },
  orders: () => request<{ orders: Order[] }>("/api/v1/customer/orders").then((x) => x.orders),
  order: (number: string, trackingToken?: string) => request<{ order: Order }>(`${customer}/orders/${encodeURIComponent(number)}${trackingToken ? `?token=${encodeURIComponent(trackingToken)}` : ""}`).then((x) => x.order),
  reorder: (number: string) => request<{ items: { variantId: string | null; productId: string | null; slug: string | null; nameDe: string | null; nameEn: string | null; variantDe: string | null; variantEn: string | null; imageUrl: string | null; requestedQuantity: number; quantity: number; currentPriceRappen: number | null; available: boolean }[] }>(`${customer}/orders/${encodeURIComponent(number)}/reorder`, { method: "POST" }),
  resumePayment: (number: string, trackingToken?: string) => request<{ checkoutUrl: string | null }>(`${customer}/orders/${encodeURIComponent(number)}/payment`, { method: "POST", body: JSON.stringify({ trackingToken }) }),
  registerPush: (token: string, locale: Locale, orderNumber?: string, trackingToken?: string) => request<void>(`${customer}/devices/push`, { method: "POST", body: JSON.stringify({ token, locale, orderNumber, trackingToken }) }),
};
