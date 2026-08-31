import { formatChf, localizedSnapshot, paymentMethodLabel, sortOrdersByLatestActivity, totalItemQuantity } from "./presentation.ts";
import { formatReceipt } from "./printer/receipt.ts";
import type { Order } from "./types.ts";

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
}

function order(status: Order["status"], createdAt: string, quantity = 1): Order {
  return {
    orderNumber: `SNP-${createdAt}`,
    locale: "DE",
    customerName: "Test",
    customerEmail: "test@example.com",
    customerPhone: "+41000000000",
    fulfillmentType: "PICKUP",
    status,
    paymentMethod: "PAY_AT_PICKUP",
    payment: { provider: "CASH", status: "PENDING", amountRappen: 1000, refundedRappen: 0, paidAt: null },
    createdAt,
    updatedAt: createdAt,
    subtotalRappen: 1000,
    discountRappen: 0,
    deliveryFeeRappen: 0,
    taxRateBps: null,
    taxAmountRappen: 0,
    totalRappen: 1000,
    remainingRefundableRappen: 0,
    version: 0,
    note: null,
    deliveryZoneNameDe: null,
    deliveryZoneNameEn: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    address: null,
    items: [{
      imageUrl: null,
      productNameDe: "Gericht",
      productNameEn: "Product",
      variantNameDe: null,
      variantNameEn: null,
      unitPriceRappen: 1000,
      quantity,
      lineSubtotalRappen: 1000,
      options: [],
    }],
    statusEvents: [],
    allowedActions: { nextStatus: null, canConfirmCash: false, canCancel: false, canRefundAndCancel: false },
  };
}

const olderCreatedButRecentlyUpdated = order("PROCESSING", "2026-08-12T10:00:00Z");
olderCreatedButRecentlyUpdated.updatedAt = "2026-08-12T12:00:00Z";
const latest = sortOrdersByLatestActivity([
  order("CONFIRMED", "2026-08-12T11:00:00Z", 3),
  olderCreatedButRecentlyUpdated,
]);

equal(latest[0].status, "PROCESSING");
equal(totalItemQuantity(latest[1]), 3);
const sameActivityOne = order("CONFIRMED", "2026-08-12T11:00:00Z");
const sameActivityTwo = order("CONFIRMED", "2026-08-12T11:00:00Z");
sameActivityOne.orderNumber = "SNP-000001";
sameActivityTwo.orderNumber = "SNP-000002";
equal(sortOrdersByLatestActivity([sameActivityOne, sameActivityTwo])[0].orderNumber, "SNP-000002");
equal(localizedSnapshot("Produkt", "Product", "en"), "Product");
equal(paymentMethodLabel("CASH_ON_DELIVERY", "en"), "Cash on delivery");
if (!/12\.34/.test(formatChf(1234, "de"))) throw new Error("CHF formatting failed");
const longOrder = order("CONFIRMED", "2026-08-12T10:00:00Z");
longOrder.items[0].productNameDe = "Sehr langes Poulet Tikka mit hausgemachter Spezialmarinade";
longOrder.note = "Bitte klingeln und die Bestellung vorsichtig transportieren.";
for (const width of [58, 80] as const) {
  const receipt = formatReceipt(longOrder, width);
  const columns = width === 58 ? 32 : 48;
  if (receipt.trimEnd().split("\n").some((line) => line.length > columns)) throw new Error(`${width}mm receipt overflowed`);
  if (!receipt.includes("ZAMBIEL") || receipt.includes("SaltNPepper")) throw new Error("Receipt branding is incorrect");
  if (receipt.includes("\x1dV")) throw new Error("Receipt text must not cut paper");
  if (!receipt.endsWith("\n") || receipt.endsWith("\n\n")) throw new Error("Receipt must have exactly one trailing feed");
  if (receipt.includes("Delivery / Lieferung")) throw new Error("Pickup receipt must omit delivery");
}
const freeDelivery = order("CONFIRMED", "2026-08-12T10:00:00Z");
freeDelivery.fulfillmentType = "DELIVERY";
if (!/Delivery \/ Lieferung\s+FREE/.test(formatReceipt(freeDelivery, 58))) throw new Error("Free delivery missing");
freeDelivery.deliveryFeeRappen = 500;
if (!formatReceipt(freeDelivery, 58).includes("CHF 5.00")) throw new Error("Paid delivery missing");
console.log("presentation helpers: ok");
