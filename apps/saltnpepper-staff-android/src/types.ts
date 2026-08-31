export type User = {
  id: string;
  email: string;
  name: string | null;
  role: "OWNER" | "STAFF";
};

export type Session = {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  user: User;
};

export type OrderStatus =
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "PICKED_UP"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "PARTIALLY_REFUNDED" | "REFUNDED";

export type AllowedActions = {
  nextStatus: OrderStatus | null;
  canConfirmCash: boolean;
  canCancel: boolean;
  canRefundAndCancel: boolean;
};

export type Order = {
  orderNumber: string;
  locale: "DE" | "EN";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  status: OrderStatus;
  paymentMethod: "STRIPE" | "CASH_ON_DELIVERY" | "PAY_AT_PICKUP";
  payment: {
    provider: "STRIPE" | "CASH";
    status: PaymentStatus;
    amountRappen: number;
    refundedRappen: number;
    paidAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  subtotalRappen: number;
  discountRappen: number;
  deliveryFeeRappen: number;
  taxRateBps: number | null;
  taxAmountRappen: number;
  totalRappen: number;
  remainingRefundableRappen: number;
  version: number;
  note: string | null;
  deliveryZoneNameDe: string | null;
  deliveryZoneNameEn: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  address: {
    recipientName: string;
    phone: string;
    street: string;
    streetExtra: string | null;
    postalCode: string;
    city: string;
    countryCode: string;
  } | null;
  items: Array<{
    imageUrl: string | null;
    productNameDe: string;
    productNameEn: string;
    variantNameDe: string | null;
    variantNameEn: string | null;
    unitPriceRappen: number;
    quantity: number;
    lineSubtotalRappen: number;
    options: Array<{
      nameDe: string;
      nameEn: string;
      priceDeltaRappen: number;
    }>;
  }>;
  statusEvents: Array<{
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    reason: string | null;
    note: string | null;
    createdAt: string;
    actorName: string | null;
  }>;
  allowedActions: AllowedActions;
};
