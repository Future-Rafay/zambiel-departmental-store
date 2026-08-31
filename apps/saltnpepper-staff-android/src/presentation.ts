import type { Order, OrderStatus, PaymentStatus } from './types.ts';

export type Language = 'de' | 'en';
export const DEFAULT_LANGUAGE: Language = 'de';

export function localizedSnapshot(
  de: string | null,
  en: string | null,
  language: Language,
) {
  return (language === 'de' ? de || en : en || de) ?? '—';
}

export function formatChf(rappen: number, language: Language) {
  return new Intl.NumberFormat(language === 'de' ? 'de-CH' : 'en-CH', {
    style: 'currency',
    currency: 'CHF',
  }).format(rappen / 100);
}

export function formatZurichDateTime(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'de' ? 'de-CH' : 'en-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Zurich',
  }).format(new Date(value));
}

const statusLabels: Record<OrderStatus, Record<Language, string>> = {
  PAYMENT_PENDING: { de: 'Zahlung ausstehend', en: 'Payment pending' },
  CONFIRMED: { de: 'Bestätigt', en: 'Confirmed' },
  PROCESSING: { de: 'In Bearbeitung', en: 'Processing' },
  READY_FOR_PICKUP: { de: 'Abholbereit', en: 'Ready for pickup' },
  OUT_FOR_DELIVERY: { de: 'Unterwegs', en: 'Out for delivery' },
  DELIVERED: { de: 'Geliefert', en: 'Delivered' },
  PICKED_UP: { de: 'Abgeholt', en: 'Picked up' },
  CANCELLED: { de: 'Storniert', en: 'Cancelled' },
};

export function statusLabel(status: OrderStatus, language: Language) {
  return statusLabels[status][language];
}

export function fulfillmentLabel(
  type: Order['fulfillmentType'],
  language: Language,
) {
  return type === 'DELIVERY'
    ? language === 'de'
      ? 'Lieferung'
      : 'Delivery'
    : language === 'de'
      ? 'Abholung'
      : 'Pickup';
}

export function paymentStatusLabel(
  status: PaymentStatus | null,
  language: Language,
) {
  if (!status) return language === 'de' ? 'Nicht erfasst' : 'Not recorded';
  const labels: Record<PaymentStatus, Record<Language, string>> = {
    PENDING: { de: 'Ausstehend', en: 'Pending' },
    PAID: { de: 'Bezahlt', en: 'Paid' },
    FAILED: { de: 'Fehlgeschlagen', en: 'Failed' },
    PARTIALLY_REFUNDED: { de: 'Teilweise erstattet', en: 'Partially refunded' },
    REFUNDED: { de: 'Erstattet', en: 'Refunded' },
  };
  return labels[status][language];
}

export function paymentMethodLabel(
  method: Order['paymentMethod'],
  language: Language,
) {
  const labels: Record<Order['paymentMethod'], Record<Language, string>> = {
    STRIPE: { de: 'Karte / Online', en: 'Card / online' },
    CASH_ON_DELIVERY: {
      de: 'Barzahlung bei Lieferung',
      en: 'Cash on delivery',
    },
    PAY_AT_PICKUP: { de: 'Zahlung bei Abholung', en: 'Pay at pickup' },
  };
  return labels[method][language];
}

export function totalItemQuantity(order: Pick<Order, 'items'>) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

export function sortOrdersByLatestActivity(orders: Order[]) {
  return [...orders].sort(
    (a, b) =>
      Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
      Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
      b.orderNumber.localeCompare(a.orderNumber),
  );
}
