"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { useCart } from "@/components/site/cart-context";
import {
  AddressFields,
  CheckoutSummary,
  CustomerFields,
  FulfillmentChoices,
  PaymentChoices,
  type CheckoutUser,
  type FieldErrors,
  type FulfillmentType,
  type PaymentMethod,
  type Quote,
} from "@/components/site/checkout-sections";
import { Card } from "@/components/ui/card";
import { createLatestRequest, isAbortError } from "@/lib/latest-request";

type ApiError = { error?: string; details?: Array<{ path: PropertyKey[] }> };
const fieldByPath: Record<string, string> = {
  postcode: "postalCode",
  customerName: "customerName",
  customerEmail: "customerEmail",
  customerPhone: "customerPhone",
  paymentMethod: "paymentMethod",
  "address.recipientName": "customerName",
  "address.phone": "customerPhone",
  "address.street": "street",
  "address.streetExtra": "streetExtra",
  "address.postalCode": "postalCode",
  "address.city": "city",
};

export function CheckoutForm({
  locale,
  user,
}: {
  locale: "de" | "en";
  user?: CheckoutUser;
}) {
  const { items, clear } = useCart();
  const de = locale === "de";
  const formRef = useRef<HTMLFormElement>(null);
  const checkoutKey = useRef("");
  const [quoteRequests] = useState(createLatestRequest);
  const [fulfillmentType, setFulfillmentType] =
    useState<FulfillmentType>("PICKUP");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("PAY_AT_PICKUP");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkoutKey.current = crypto.randomUUID();
    return () => quoteRequests.cancel();
  }, [quoteRequests]);

  const payloadItems = items.map(({ variantId, quantity }) => ({
    variantId,
    quantity,
  }));
  function message(code = "") {
    const messages: Record<string, [string, string]> = {
      POSTCODE_NOT_DELIVERABLE: [
        "An diese Postleitzahl liefern wir derzeit nicht.",
        "We do not currently deliver to this postcode.",
      ],
      DELIVERY_MINIMUM_NOT_MET: [
        "Der Mindestbestellwert ist noch nicht erreicht.",
        "The delivery minimum has not been reached.",
      ],
      OUT_OF_STOCK: [
        "Ein Artikel ist nicht mehr in der gewünschten Menge verfügbar.",
        "An item is no longer available in the requested quantity.",
      ],
      PRODUCT_UNAVAILABLE: [
        "Ein Artikel ist nicht mehr verfügbar.",
        "An item is no longer available.",
      ],
      PROMO_INVALID: [
        "Dieser Gutscheincode ist ungültig.",
        "This discount code is invalid.",
      ],
      PAYMENT_NOT_CONFIGURED: [
        "Kartenzahlung ist noch nicht konfiguriert.",
        "Card payment is not configured yet.",
      ],
      PAYMENT_OR_ADDRESS_INVALID: [
        "Zahlungsart oder Lieferadresse ist ungültig.",
        "The payment method or delivery address is invalid.",
      ],
      INVALID_INPUT: [
        "Bitte prüfen Sie Ihre Eingaben.",
        "Please check your details.",
      ],
    };
    return (messages[code] ?? [
      "Bestellung konnte nicht abgeschlossen werden.",
      "The order could not be completed.",
    ])[de ? 0 : 1];
  }

  function applyApiError(value: unknown) {
    const api = value && typeof value === "object" ? (value as ApiError) : {};
    const next: FieldErrors = {};
    for (const issue of api.details ?? []) {
      const field = fieldByPath[issue.path.join(".")];
      if (field) next[field] = message("INVALID_INPUT");
    }
    if (api.error === "POSTCODE_NOT_DELIVERABLE")
      next.postalCode = message(api.error);
    setFieldErrors(next);
    setError(Object.keys(next).length ? "" : message(api.error));
    const first = Object.keys(next)[0];
    if (first)
      requestAnimationFrame(() => document.getElementById(first)?.focus());
  }

  async function readResponse(response: Response) {
    const body = await response.json();
    if (!response.ok) throw body;
    return body;
  }

  async function refreshQuote() {
    quoteRequests.cancel();
    if (!formRef.current || items.length === 0) return;
    const data = new FormData(formRef.current);
    if (fulfillmentType === "DELIVERY" && !data.get("postalCode")) return;
    const request = quoteRequests.begin();
    setError("");
    try {
      const next = await fetch("/api/v1/customer/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: request.signal,
        body: JSON.stringify({
          items: payloadItems,
          fulfillmentType,
          postcode:
            fulfillmentType === "DELIVERY" ? data.get("postalCode") : undefined,
          promoCode: data.get("promoCode") || undefined,
          customerEmail: data.get("customerEmail") || undefined,
        }),
      }).then(readResponse);
      if (!request.isCurrent()) return;
      setQuote(next);
      setFieldErrors({});
    } catch (caught) {
      if (!request.isCurrent() || isAbortError(caught)) return;
      setQuote(null);
      applyApiError(caught);
    }
  }

  useEffect(() => {
    if (fulfillmentType === "PICKUP") void refreshQuote();
    // refreshQuote intentionally reads the current form and cart snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fulfillmentType, items]);

  function chooseFulfillment(value: FulfillmentType) {
    quoteRequests.cancel();
    setFulfillmentType(value);
    setPaymentMethod(
      value === "DELIVERY" ? "CASH_ON_DELIVERY" : "PAY_AT_PICKUP",
    );
    setQuote(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkoutKey.current || items.length === 0) return;
    const data = new FormData(event.currentTarget);
    quoteRequests.cancel();
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const postalCode = String(data.get("postalCode") ?? "");
      const order = await fetch("/api/v1/customer/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutKey: checkoutKey.current,
          locale,
          items: payloadItems,
          fulfillmentType,
          postcode: fulfillmentType === "DELIVERY" ? postalCode : undefined,
          promoCode: data.get("promoCode") || undefined,
          customerName: data.get("customerName"),
          customerEmail: data.get("customerEmail"),
          customerPhone: data.get("customerPhone"),
          paymentMethod,
          note: data.get("note") || undefined,
          address:
            fulfillmentType === "DELIVERY"
              ? {
                  recipientName: data.get("customerName"),
                  phone: data.get("customerPhone"),
                  street: data.get("street"),
                  streetExtra: data.get("streetExtra") || undefined,
                  postalCode,
                  city: data.get("city"),
                }
              : undefined,
        }),
      }).then(readResponse);
      clear();
      window.location.assign(
        order.checkoutUrl ??
          `/${locale}/orders/${order.orderNumber}?token=${encodeURIComponent(order.trackingToken)}`,
      );
    } catch (caught) {
      applyApiError(caught);
      setBusy(false);
    }
  }

  if (items.length === 0)
    return (
      <Card className="rounded-none p-8 text-center">
        <p>{de ? "Ihr Warenkorb ist leer." : "Your cart is empty."}</p>
      </Card>
    );

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="grid gap-6 lg:grid-cols-[1fr_22rem]"
      noValidate
    >
      <div className="space-y-6">
        <FulfillmentChoices
          de={de}
          value={fulfillmentType}
          onChange={chooseFulfillment}
        />
        <CustomerFields de={de} user={user} errors={fieldErrors} />
        {fulfillmentType === "DELIVERY" ? (
          <AddressFields
            de={de}
            user={user}
            errors={fieldErrors}
            refreshQuote={() => void refreshQuote()}
          />
        ) : null}
        <PaymentChoices
          de={de}
          fulfillmentType={fulfillmentType}
          paymentMethod={paymentMethod}
          errors={fieldErrors}
          onChange={setPaymentMethod}
        />
      </div>
      <CheckoutSummary
        de={de}
        locale={locale}
        items={items}
        quote={quote}
        error={error}
        errors={fieldErrors}
        busy={busy}
        refreshQuote={() => void refreshQuote()}
      />
    </form>
  );
}
