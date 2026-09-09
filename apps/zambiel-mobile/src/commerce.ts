import type { CartLine, Locale, Product, Variant } from "./types";

export function money(rappen: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "de" ? "de-CH" : "en-CH", { style: "currency", currency: "CHF" }).format(rappen / 100);
}
export function addCartLines(current: CartLine[], additions: CartLine[]) {
  const next = current.map((line) => ({ ...line }));
  for (const line of additions) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || !line.variantId) continue;
    const existing = next.find((entry) => entry.variantId === line.variantId);
    if (existing) existing.quantity = Math.min(20, existing.quantity + line.quantity);
    else if (next.length < 100) next.push({ ...line, quantity: Math.min(20, line.quantity) });
  }
  return next;
}
export function readCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return addCartLines([], value.filter((line): line is CartLine => !!line && typeof line.variantId === "string" && typeof line.productId === "string" && typeof line.slug === "string" && typeof line.name === "string" && typeof line.variant === "string" && Number.isSafeInteger(line.priceRappen) && line.priceRappen >= 0 && Number.isInteger(line.quantity) && line.quantity > 0 && (line.imageUrl === null || typeof line.imageUrl === "string")));
}
export function cartLine(product: Product, variant: Variant, quantity = 1): CartLine {
  return { productId: product.id, slug: product.slug, name: product.name, variantId: variant.id, variant: variant.optionValues.map((value) => `${value.optionName}: ${value.value}`).join(" · ") || variant.name, imageUrl: variant.imageUrl || product.imageUrl, priceRappen: variant.priceRappen, quantity };
}
export function selectedVariant(product: Product, choices: Record<string, string>) {
  return product.variants.find((variant) => product.options.every((option) => variant.optionValues.some((value) => value.optionId === option.id && value.valueId === choices[option.id])));
}
export function orderNumberFromLink(url: string): string | null {
  try {
    const link = new URL(url);
    if (link.protocol !== "zambiel:") return null;
    const path = `${link.hostname}${link.pathname}`;
    return /^orders\/(ZAM-\d+)$/.exec(path)?.[1] ?? null;
  } catch { return null; }
}
export function priceFilter(value: string): number | undefined {
  if (!value.trim()) return undefined;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) throw new Error("INVALID_PRICE");
  const [whole, decimal = ""] = value.trim().replace(",", ".").split(".");
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) throw new Error("INVALID_PRICE");
  return amount;
}
const statuses: Record<string, [string, string]> = { PAYMENT_PENDING: ["Zahlung ausstehend", "Awaiting payment"], CONFIRMED: ["Bestätigt", "Confirmed"], PROCESSING: ["In Bearbeitung", "Processing"], OUT_FOR_DELIVERY: ["Unterwegs", "Out for delivery"], DELIVERED: ["Geliefert", "Delivered"], READY_FOR_PICKUP: ["Abholbereit", "Ready for pickup"], PICKED_UP: ["Abgeholt", "Picked up"], CANCELLED: ["Storniert", "Cancelled"] };
export function statusLabel(status: string, locale: Locale) { return statuses[status]?.[locale === "de" ? 0 : 1] ?? status; }
