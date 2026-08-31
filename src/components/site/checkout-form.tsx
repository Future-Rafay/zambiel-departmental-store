"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useCart } from "@/components/site/cart-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/orders";

type Quote = {
  subtotalRappen: number;
  discountRappen: number;
  deliveryFeeRappen: number;
  totalRappen: number;
};
type ApiError = { error?: string; details?: Array<{ path: PropertyKey[] }> };
type FieldErrors = Partial<Record<string, string>>;
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
  user?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: {
      street: string;
      streetExtra?: string | null;
      postalCode: string;
      city: string;
    } | null;
  };
}) {
  const { items, clear } = useCart();
  const de = locale === "de";
  const formRef = useRef<HTMLFormElement>(null);
  const checkoutKey = useRef("");
  const [fulfillmentType, setFulfillmentType] = useState<"DELIVERY" | "PICKUP">(
    "PICKUP",
  );
  const [paymentMethod, setPaymentMethod] = useState<
    "STRIPE" | "CASH_ON_DELIVERY" | "PAY_AT_PICKUP"
  >("PAY_AT_PICKUP");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    checkoutKey.current = crypto.randomUUID();
  }, []);

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
    if (!formRef.current || items.length === 0) return;
    const data = new FormData(formRef.current);
    if (fulfillmentType === "DELIVERY" && !data.get("postalCode")) return;
    setError("");
    try {
      const next = await fetch("/api/v1/customer/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          fulfillmentType,
          postcode:
            fulfillmentType === "DELIVERY" ? data.get("postalCode") : undefined,
          promoCode: data.get("promoCode") || undefined,
          customerEmail: data.get("customerEmail") || undefined,
        }),
      }).then(readResponse);
      setQuote(next);
      setFieldErrors({});
    } catch (caught) {
      setQuote(null);
      applyApiError(caught);
    }
  }
  useEffect(() => {
    if (fulfillmentType === "PICKUP") void refreshQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fulfillmentType, items]);
  function chooseFulfillment(value: "DELIVERY" | "PICKUP") {
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
  const radioCard =
    "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/15";
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
        <Card className="space-y-4 p-5">
          <fieldset>
            <legend className="mb-3 font-display text-xl font-bold">
              {de ? "Lieferart" : "Fulfillment"}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["PICKUP", "DELIVERY"] as const).map((value) => (
                <label key={value} className={radioCard}>
                  <input
                    type="radio"
                    name="fulfillmentType"
                    value={value}
                    checked={fulfillmentType === value}
                    onChange={() => chooseFulfillment(value)}
                  />
                  <span className="font-semibold">
                    {value === "PICKUP"
                      ? de
                        ? "Abholung"
                        : "Pickup"
                      : de
                        ? "Lieferung"
                        : "Delivery"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-display text-xl font-bold sm:col-span-2">
            {de ? "Kontaktdaten" : "Contact details"}
          </h2>
          <Field
            id="customerName"
            label="Name"
            error={fieldErrors.customerName}
          >
            <Input
              id="customerName"
              name="customerName"
              autoComplete="name"
              defaultValue={user?.name ?? ""}
              required
              aria-invalid={!!fieldErrors.customerName}
            />
          </Field>
          <Field
            id="customerEmail"
            label={de ? "E-Mail" : "Email"}
            error={fieldErrors.customerEmail}
          >
            <Input
              id="customerEmail"
              name="customerEmail"
              type="email"
              autoComplete="email"
              defaultValue={user?.email ?? ""}
              required
              aria-invalid={!!fieldErrors.customerEmail}
            />
          </Field>
          <Field
            id="customerPhone"
            label={de ? "Telefon" : "Phone"}
            error={fieldErrors.customerPhone}
          >
            <Input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              autoComplete="tel"
              defaultValue={user?.phone ?? ""}
              required
              aria-invalid={!!fieldErrors.customerPhone}
            />
          </Field>
        </Card>
        {fulfillmentType === "DELIVERY" && (
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <h2 className="font-display text-xl font-bold sm:col-span-2">
              {de ? "Lieferadresse" : "Delivery address"}
            </h2>
            <Field
              id="street"
              label={de ? "Strasse und Hausnummer" : "Street and number"}
              error={fieldErrors.street}
              className="sm:col-span-2"
            >
              <Input
                id="street"
                name="street"
                autoComplete="street-address"
                defaultValue={user?.address?.street}
                required
                aria-invalid={!!fieldErrors.street}
              />
            </Field>
            <Field
              id="streetExtra"
              label={
                de ? "Adresszusatz (optional)" : "Address extra (optional)"
              }
              error={fieldErrors.streetExtra}
              className="sm:col-span-2"
            >
              <Input
                id="streetExtra"
                name="streetExtra"
                defaultValue={user?.address?.streetExtra ?? ""}
              />
            </Field>
            <Field
              id="postalCode"
              label={de ? "Postleitzahl" : "Postal code"}
              error={fieldErrors.postalCode}
            >
              <Input
                id="postalCode"
                name="postalCode"
                inputMode="numeric"
                autoComplete="postal-code"
                defaultValue={user?.address?.postalCode}
                onBlur={() => void refreshQuote()}
                required
                aria-invalid={!!fieldErrors.postalCode}
              />
            </Field>
            <Field
              id="city"
              label={de ? "Ort" : "City"}
              error={fieldErrors.city}
            >
              <Input
                id="city"
                name="city"
                autoComplete="address-level2"
                defaultValue={user?.address?.city}
                required
                aria-invalid={!!fieldErrors.city}
              />
            </Field>
          </Card>
        )}
        <Card className="space-y-4 p-5">
          <fieldset>
            <legend className="mb-3 font-display text-xl font-bold">
              {de ? "Zahlung" : "Payment"}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={radioCard}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="STRIPE"
                  checked={paymentMethod === "STRIPE"}
                  onChange={() => setPaymentMethod("STRIPE")}
                />
                <span className="font-semibold">
                  {de ? "Karte (Stripe)" : "Card (Stripe)"}
                </span>
              </label>
              <label className={radioCard}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={
                    fulfillmentType === "DELIVERY"
                      ? "CASH_ON_DELIVERY"
                      : "PAY_AT_PICKUP"
                  }
                  checked={paymentMethod !== "STRIPE"}
                  onChange={() =>
                    setPaymentMethod(
                      fulfillmentType === "DELIVERY"
                        ? "CASH_ON_DELIVERY"
                        : "PAY_AT_PICKUP",
                    )
                  }
                />
                <span className="font-semibold">
                  {fulfillmentType === "DELIVERY"
                    ? de
                      ? "Bar bei Lieferung"
                      : "Cash on delivery"
                    : de
                      ? "Bar bei Abholung"
                      : "Cash at pickup"}
                </span>
              </label>
            </div>
            {fieldErrors.paymentMethod && (
              <p className="mt-2 text-sm text-destructive">
                {fieldErrors.paymentMethod}
              </p>
            )}
          </fieldset>
          <Field
            id="note"
            label={de ? "Bestellnotiz (optional)" : "Order note (optional)"}
          >
            <textarea
              id="note"
              name="note"
              maxLength={1000}
              className="min-h-24 w-full rounded-xl border border-border bg-surface p-3 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </Field>
        </Card>
      </div>
      <Card className="h-fit space-y-4 p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-xl font-bold">
          {de ? "Zusammenfassung" : "Summary"}
        </h2>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.key} className="flex justify-between gap-3">
              <span>
                {item.quantity} × {item.productName}
              </span>
              <span>
                {formatMoney(item.unitPriceRappen * item.quantity, locale)}
              </span>
            </li>
          ))}
        </ul>
        <Field
          id="promoCode"
          label={de ? "Rabattcode" : "Discount code"}
          error={fieldErrors.promoCode}
        >
          <Input
            id="promoCode"
            name="promoCode"
            onBlur={() => void refreshQuote()}
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void refreshQuote()}
        >
          {de ? "Summe aktualisieren" : "Update total"}
        </Button>
        {quote && (
          <dl className="space-y-2 border-y border-border py-4 text-sm">
            <div className="flex justify-between">
              <dt>{de ? "Zwischensumme" : "Subtotal"}</dt>
              <dd>{formatMoney(quote.subtotalRappen, locale)}</dd>
            </div>
            {quote.discountRappen > 0 && (
              <div className="flex justify-between">
                <dt>{de ? "Rabatt" : "Discount"}</dt>
                <dd>−{formatMoney(quote.discountRappen, locale)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>{de ? "Lieferung" : "Delivery"}</dt>
              <dd>{formatMoney(quote.deliveryFeeRappen, locale)}</dd>
            </div>
            <div className="flex justify-between pt-2 text-base font-bold">
              <dt>{de ? "Gesamt" : "Total"}</dt>
              <dd>{formatMoney(quote.totalRappen, locale)}</dd>
            </div>
          </dl>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy || !quote}>
          {busy
            ? de
              ? "Wird verarbeitet…"
              : "Processing…"
            : de
              ? "Bestellung aufgeben"
              : "Place order"}
        </Button>
        <p className="text-xs text-muted">
          {de
            ? "Preise, Bestand und Liefergebiet werden serverseitig erneut geprüft."
            : "Prices, stock, and delivery eligibility are revalidated by the server."}
        </p>
      </Card>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
