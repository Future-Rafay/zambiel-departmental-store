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
  type ShippingCountry,
} from "@/components/site/checkout-sections";
import { Card } from "@/components/ui/card";
import { createLatestRequest, isAbortError } from "@/lib/latest-request";

type ApiError = { error?: string; details?: Array<{ path: PropertyKey[] }> };
const fieldByPath: Record<string, string> = {
  countryCode: "countryCode",
  customerName: "customerName",
  customerEmail: "customerEmail",
  customerPhone: "customerPhone",
  paymentMethod: "paymentMethod",
  "address.recipientName": "customerName",
  "address.phone": "customerPhone",
  "address.street": "street",
  "address.streetExtra": "streetExtra",
  "address.countryCode": "countryCode",
  "address.city": "city",
};

export function CheckoutForm({
  locale,
  user,
  countries,
  storeMode = "b2c",
}: {
  locale: "de" | "en";
  user?: CheckoutUser;
  countries: ShippingCountry[];
  storeMode?: "b2c" | "b2b";
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
  const [quoting, setQuoting] = useState(false);
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
  function message(code = "", fallback: [string, string] = ["Bestellung konnte nicht abgeschlossen werden.", "The order could not be completed."]) {
    const messages: Record<string, [string, string]> = {
      COUNTRY_NOT_DELIVERABLE: [
        "In dieses Land liefern wir derzeit nicht.",
        "We do not currently ship to this country.",
      ],
      DELIVERY_MINIMUM_NOT_MET: [
        "Der Mindestbestellwert ist noch nicht erreicht.",
        "The delivery minimum has not been reached.",
      ],
      CHECKOUT_KEY_USED: [
        "Der letzte Zahlungsversuch ist fehlgeschlagen. Bitte senden Sie die Bestellung erneut.",
        "The last payment attempt failed. Please submit your order again.",
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
      INVALID_INPUT: [
        "Bitte prüfen Sie Ihre Eingaben.",
        "Please check your details.",
      ],
    };
    return (messages[code] ?? fallback)[de ? 0 : 1];
  }

  function applyApiError(value: unknown, fallback?: [string, string]) {
    const api = value && typeof value === "object" ? (value as ApiError) : {};
    const next: FieldErrors = {};
    for (const issue of api.details ?? []) {
      const field = fieldByPath[issue.path.join(".")];
      if (field) next[field] = message("INVALID_INPUT");
    }
    if (api.error === "COUNTRY_NOT_DELIVERABLE")
      next.countryCode = message(api.error);
    setFieldErrors(next);
    setError(Object.keys(next).length ? "" : message(api.error, fallback));
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
    const data = formRef.current && items.length > 0 ? new FormData(formRef.current) : null;
    if (!data || (fulfillmentType === "DELIVERY" && !data.get("countryCode"))) {
      setQuoting(false);
      return;
    }
    const request = quoteRequests.begin();
    setQuoting(true);
    setError("");
    try {
      const next = await fetch("/api/v1/customer/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: request.signal,
        body: JSON.stringify({
          items: payloadItems,
          fulfillmentType,
          countryCode:
            fulfillmentType === "DELIVERY" ? data.get("countryCode") : undefined,
          promoCode: data.get("promoCode") || undefined,
          customerEmail: data.get("customerEmail") || undefined,
          storeMode,
        }),
      }).then(readResponse);
      if (!request.isCurrent()) return;
      setQuote(next);
      setFieldErrors({});
    } catch (caught) {
      if (!request.isCurrent() || isAbortError(caught)) return;
      setQuote(null);
      applyApiError(caught, ["Die Summe konnte nicht berechnet werden. Bitte versuchen Sie es erneut.", "Your total could not be calculated. Please try again."]);
    } finally {
      if (request.isCurrent()) setQuoting(false);
    }
  }

  useEffect(() => {
    void refreshQuote();
    // refreshQuote intentionally reads the current form and cart snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fulfillmentType, items]);

  function chooseFulfillment(value: FulfillmentType) {
    quoteRequests.cancel();
    setFulfillmentType(value);
    setPaymentMethod((current) => current === "INVOICE_BANK_TRANSFER" ? current : value === "DELIVERY" ? "CASH_ON_DELIVERY" : "PAY_AT_PICKUP");
    setQuote(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkoutKey.current || items.length === 0) return;
    const data = new FormData(event.currentTarget);
    quoteRequests.cancel();
    setQuoting(false);
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const countryCode = String(data.get("countryCode") ?? "");
      const order = await fetch("/api/v1/customer/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutKey: checkoutKey.current,
          locale,
          items: payloadItems,
          fulfillmentType,
          countryCode: fulfillmentType === "DELIVERY" ? countryCode : undefined,
          promoCode: data.get("promoCode") || undefined,
          customerName: data.get("customerName"),
          customerEmail: data.get("customerEmail"),
          customerPhone: data.get("customerPhone"),
          paymentMethod,
          storeMode,
          note: data.get("note") || undefined,
          address:
            fulfillmentType === "DELIVERY"
              ? {
                  recipientName: data.get("customerName"),
                  phone: data.get("customerPhone"),
                  street: data.get("street"),
                  streetExtra: data.get("streetExtra") || undefined,
                  city: data.get("city"),
                  countryCode,
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
      // The server answered (no live order holds this key), so the next submit must not replay it.
      if (!(caught instanceof Error)) checkoutKey.current = crypto.randomUUID();
      applyApiError(caught);
      setBusy(false);
    }
  }

  if (items.length === 0)
    return (
      <Card className="p-8 text-center">
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
            countries={countries}
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
          b2b={storeMode === "b2b"}
        />
      </div>
      <CheckoutSummary
        de={de}
        locale={locale}
        items={items}
        quote={quote}
        quoting={quoting}
        error={error}
        errors={fieldErrors}
        busy={busy}
        refreshQuote={() => void refreshQuote()}
      />
    </form>
  );
}
