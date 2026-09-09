import type { Locale } from "./types";

const copy = {
  de: { home: "Start", shop: "Shop", cart: "Warenkorb", orders: "Bestellungen", account: "Konto", search: "Produkte suchen", categories: "Kategorien", featured: "Entdecken", emptyProducts: "Keine Produkte gefunden.", emptyCart: "Dein Warenkorb ist leer.", checkout: "Zur Kasse", add: "In den Warenkorb", login: "Anmelden", register: "Konto erstellen", logout: "Abmelden", wishlist: "Wunschliste", addresses: "Adressen", support: "Hilfe & Rechtliches", retry: "Erneut versuchen", loading: "Wird geladen …", track: "Bestellung verfolgen", reorder: "Erneut bestellen", save: "Speichern", continueGuest: "Als Gast fortfahren", total: "Gesamt", remove: "Entfernen", deleteAccount: "Kontolöschung beantragen" },
  en: { home: "Home", shop: "Shop", cart: "Cart", orders: "Orders", account: "Account", search: "Search products", categories: "Categories", featured: "Discover", emptyProducts: "No products found.", emptyCart: "Your cart is empty.", checkout: "Checkout", add: "Add to cart", login: "Sign in", register: "Create account", logout: "Sign out", wishlist: "Wishlist", addresses: "Addresses", support: "Help & legal", retry: "Try again", loading: "Loading…", track: "Track order", reorder: "Order again", save: "Save", continueGuest: "Continue as guest", total: "Total", remove: "Remove", deleteAccount: "Request account deletion" },
} as const;
export function t(locale: Locale) { return copy[locale]; }

